import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppState, Category, Mission, RankUser } from './data/types'
import { CATEGORY_TO_STAT, expForLevel } from './data/types'
import { seedState } from './data/seed'
import { pickDailyMissions, DAILY_REWARD } from './data/dailyPool'
import { SELF_REWARD } from './data/selfMissions'
import { appDate } from './lib/appDate'
import { getUserId } from './lib/session'
import { registerProfile, syncStats, logMission } from './lib/api'

const STORAGE_KEY = 'kindai-growth-state-v2'

/** 保存状態を読み込み、当日のデイリーミッションを保証する */
function loadState(): AppState {
  let s: AppState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    s = raw ? (JSON.parse(raw) as AppState) : structuredClone(seedState)
  } catch {
    s = structuredClone(seedState)
  }
  const today = appDate()
  if (s.missionsDate !== today || !s.missions?.length) {
    s.missions = pickDailyMissions(today)
    s.missionsDate = today
    s.user.dailyRewardAvailable = true
  }
  return s
}

interface CompleteDailyPayload {
  missionId: string
  minutes: number
  rating: number
  comment: string
}

interface CompleteSelfPayload {
  title: string
  category: Category
  minutes: number
  comment: string
}

interface CompleteResult {
  leveledUp: boolean
  newLevel: number
  gainedSP: number
  dailyBonus: boolean
}

interface Store {
  state: AppState
  expToNext: number
  /** ニックネーム登録（UUID発行・profiles/user_stats作成） */
  register: (nickname: string) => void
  /** デイリーミッション達成 */
  completeDaily: (p: CompleteDailyPayload) => CompleteResult
  /** セルフミッション達成 */
  completeSelf: (p: CompleteSelfPayload) => CompleteResult
  claimDailyReward: () => void
  redeemCoupon: (couponId: string) => boolean
  /** 学内ランキング（ローカル・Supabase未設定時のフォールバック用） */
  rankingWith: (scope: 'weekly' | 'monthly', faculty?: string) => RankUser[]
  friendRanking: () => RankUser[]
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const store: Store = useMemo(() => {
    const expToNext = expForLevel(state.user.level) - state.user.exp

    /** 報酬を適用した次状態と結果を返す共通ロジック */
    function applyReward(
      prev: AppState,
      opts: {
        type: 'daily' | 'self'
        title: string
        category: Category
        minutes: number
        comment: string
        rating: number
        sp: number
        exp: number
        coins: number
        statAmount: number
        markMissionId?: string
        allDailyBonus: boolean
      },
    ): { next: AppState; result: CompleteResult } {
      const u = { ...prev.user, stats: { ...prev.user.stats } }
      const stat = CATEGORY_TO_STAT[opts.category]

      let gainedSP = opts.sp
      let gainedExp = opts.exp

      // デイリー3件全達成ボーナス（+50スコア）
      let dailyBonus = false
      let missions = prev.missions
      if (opts.markMissionId) {
        missions = prev.missions.map((m) => (m.id === opts.markMissionId ? { ...m, done: true } : m))
        if (opts.allDailyBonus && missions.length > 0 && missions.every((m) => m.done)) {
          dailyBonus = true
          gainedSP += 50
        }
      }

      u.sp += gainedSP
      u.exp += gainedExp
      u.points += opts.coins
      u.stats[stat] = Math.min(100, u.stats[stat] + opts.statAmount)

      // レベルアップ（複数レベル繰り上がり対応）
      let leveled = false
      while (u.exp >= expForLevel(u.level)) {
        u.exp -= expForLevel(u.level)
        u.level += 1
        leveled = true
        u.points += 20
      }

      const today = appDate()
      const doneToday = prev.logs.some((l) => l.date === today)
      if (!doneToday) {
        u.streak += 1
        u.totalDays += 1
      }

      const log = {
        id: 'l' + Date.now(),
        missionTitle: opts.title,
        category: opts.category,
        minutes: opts.minutes,
        spEarned: gainedSP,
        rating: opts.rating,
        comment: opts.comment,
        date: today,
        at: Date.now(),
      }

      const next: AppState = { ...prev, user: u, missions, logs: [log, ...prev.logs] }
      return { next, result: { leveledUp: leveled, newLevel: u.level, gainedSP, dailyBonus } }
    }

    /** DBへ非同期反映（fire-and-forget） */
    function pushToDb(next: AppState, type: 'daily' | 'self', title: string, category: Category, sp: number, exp: number) {
      const u = next.user
      if (!u.userId) return
      logMission({ userId: u.userId, missionType: type, missionTitle: title, category, score: sp, exp, appDate: appDate() })
      syncStats(u.userId, { level: u.level, exp: u.exp, totalScore: u.sp, stats: u.stats })
    }

    const register: Store['register'] = (nickname) => {
      const userId = getUserId()
      setState((prev) => ({ ...prev, user: { ...prev.user, userId, name: nickname.trim(), registered: true } }))
      registerProfile(userId, nickname.trim())
    }

    const completeDaily: Store['completeDaily'] = ({ missionId, minutes, rating, comment }) => {
      const mission = state.missions.find((m) => m.id === missionId)
      let result: CompleteResult = { leveledUp: false, newLevel: state.user.level, gainedSP: 0, dailyBonus: false }
      if (!mission) return result
      setState((prev) => {
        const { next, result: r } = applyReward(prev, {
          type: 'daily',
          title: mission.title,
          category: mission.category,
          minutes,
          comment,
          rating,
          sp: DAILY_REWARD.sp,
          exp: DAILY_REWARD.exp,
          coins: DAILY_REWARD.coins,
          statAmount: DAILY_REWARD.statAmount,
          markMissionId: missionId,
          allDailyBonus: true,
        })
        result = r
        pushToDb(next, 'daily', mission.title, mission.category, r.gainedSP, DAILY_REWARD.exp)
        return next
      })
      return result
    }

    const completeSelf: Store['completeSelf'] = ({ title, category, minutes, comment }) => {
      let result: CompleteResult = { leveledUp: false, newLevel: state.user.level, gainedSP: 0, dailyBonus: false }
      const cleanTitle = title.trim() || 'セルフミッション'
      setState((prev) => {
        const { next, result: r } = applyReward(prev, {
          type: 'self',
          title: cleanTitle,
          category,
          minutes,
          comment,
          rating: 0,
          sp: SELF_REWARD.sp,
          exp: SELF_REWARD.exp,
          coins: SELF_REWARD.coins,
          statAmount: SELF_REWARD.statAmount,
          allDailyBonus: false,
        })
        result = r
        pushToDb(next, 'self', cleanTitle, category, SELF_REWARD.sp, SELF_REWARD.exp)
        return next
      })
      return result
    }

    const claimDailyReward: Store['claimDailyReward'] = () => {
      setState((prev) => {
        if (!prev.user.dailyRewardAvailable) return prev
        return {
          ...prev,
          user: { ...prev.user, sp: prev.user.sp + 50, points: prev.user.points + 30, dailyRewardAvailable: false },
        }
      })
    }

    const redeemCoupon: Store['redeemCoupon'] = (couponId) => {
      const coupon = state.coupons.find((c) => c.id === couponId)
      if (!coupon || coupon.redeemed || state.user.points < coupon.cost) return false
      setState((prev) => ({
        ...prev,
        user: { ...prev.user, points: prev.user.points - coupon.cost },
        coupons: prev.coupons.map((c) => (c.id === couponId ? { ...c, redeemed: true } : c)),
      }))
      return true
    }

    const meWeeklySP = () => state.logs.filter((l) => Date.now() - l.at < 7 * 86400000).reduce((s, l) => s + l.spEarned, 0)

    const friendRanking: Store['friendRanking'] = () => {
      const me: RankUser = { id: 'me', name: state.user.name || 'あなた', level: state.user.level, faculty: '近畿大学', weeklySP: meWeeklySP(), monthlySP: state.user.sp, isMe: true }
      const list: RankUser[] = state.friends.map((f) => ({ id: f.id, name: f.name, level: f.level, faculty: f.faculty, weeklySP: f.weeklySP, monthlySP: f.weeklySP * 4 }))
      return [me, ...list].sort((a, b) => b.weeklySP - a.weeklySP)
    }

    const rankingWith: Store['rankingWith'] = (scope, faculty) => {
      const me: RankUser = { id: 'me', name: state.user.name || 'あなた', level: state.user.level, faculty: '近畿大学', weeklySP: meWeeklySP(), monthlySP: state.user.sp, isMe: true }
      let pool = [me, ...state.ranking]
      if (faculty && faculty !== '全体') pool = pool.filter((u) => u.faculty === faculty)
      const key = scope === 'weekly' ? 'weeklySP' : 'monthlySP'
      return [...pool].sort((a, b) => b[key] - a[key])
    }

    const reset: Store['reset'] = () => {
      localStorage.removeItem(STORAGE_KEY)
      setState(loadState())
    }

    return { state, expToNext, register, completeDaily, completeSelf, claimDailyReward, redeemCoupon, rankingWith, friendRanking, reset }
  }, [state])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useApp(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within StoreProvider')
  return ctx
}
