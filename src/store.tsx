import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppState, Mission, RankUser } from './data/types'
import { expForLevel } from './data/types'
import { seedState } from './data/seed'

const STORAGE_KEY = 'kindai-growth-state-v1'

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* ignore */
  }
  return structuredClone(seedState)
}

interface CompletePayload {
  missionId: string
  minutes: number
  rating: number
  comment: string
}

interface Store {
  state: AppState
  /** 次レベルまでに必要なEXP */
  expToNext: number
  /** ミッション完了 → 報酬付与・レベル計算・ログ記録・ランキング反映 */
  completeMission: (p: CompletePayload) => { leveledUp: boolean; newLevel: number }
  claimDailyReward: () => void
  redeemCoupon: (couponId: string) => boolean
  /** 学内ランキング（自分をマージ・降順ソート） */
  rankingWith: (scope: 'weekly' | 'monthly', faculty?: string) => RankUser[]
  /** フレンドランキング（自分＋フレンド・weeklySP降順） */
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

    const completeMission: Store['completeMission'] = ({ missionId, minutes, rating, comment }) => {
      const mission = state.missions.find((m) => m.id === missionId)
      if (!mission) return { leveledUp: false, newLevel: state.user.level }

      // 実行時間に応じた時間ボーナス（目標超過分でSP増加）
      const overshoot = Math.max(0, minutes - mission.targetMinutes)
      const timeBonusSP = Math.round(overshoot * 1.5)
      const ratingBonusSP = rating >= 4 ? 5 : 0
      const gainedSP = mission.reward.sp + timeBonusSP + ratingBonusSP
      const gainedExp = mission.reward.exp + Math.round(overshoot * 0.8)

      let result = { leveledUp: false, newLevel: state.user.level }

      setState((prev) => {
        const u = { ...prev.user, stats: { ...prev.user.stats } }

        // 報酬付与
        u.sp += gainedSP
        u.points += mission.reward.coins
        u.stats[mission.reward.stat] = Math.min(100, u.stats[mission.reward.stat] + mission.reward.statAmount)
        u.exp += gainedExp

        // レベルアップ処理（複数レベル繰り上がりに対応）
        let leveled = false
        while (u.exp >= expForLevel(u.level)) {
          u.exp -= expForLevel(u.level)
          u.level += 1
          leveled = true
          // レベルアップボーナス
          u.points += 20
        }
        result = { leveledUp: leveled, newLevel: u.level }

        const today = new Date().toISOString().slice(0, 10)
        const doneToday = prev.logs.some((l) => l.date === today)
        if (!doneToday) {
          u.streak += 1
          u.totalDays += 1
        }

        const newMissions: Mission[] = prev.missions.map((m) =>
          m.id === missionId ? { ...m, done: true } : m,
        )

        const log = {
          id: 'l' + Date.now(),
          missionTitle: mission.title,
          category: mission.category,
          minutes,
          spEarned: gainedSP,
          rating,
          comment,
          date: today,
          at: Date.now(),
        }

        return { ...prev, user: u, missions: newMissions, logs: [log, ...prev.logs] }
      })

      return result
    }

    const claimDailyReward: Store['claimDailyReward'] = () => {
      setState((prev) => {
        if (!prev.user.dailyRewardAvailable) return prev
        return {
          ...prev,
          user: {
            ...prev.user,
            sp: prev.user.sp + 50,
            points: prev.user.points + 30,
            dailyRewardAvailable: false,
          },
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

    const meWeeklySP = () =>
      state.logs
        .filter((l) => Date.now() - l.at < 7 * 86400000)
        .reduce((s, l) => s + l.spEarned, 0)

    const friendRanking: Store['friendRanking'] = () => {
      const me: RankUser = {
        id: 'me',
        name: state.user.name,
        level: state.user.level,
        faculty: '経済学部',
        weeklySP: meWeeklySP(),
        monthlySP: meWeeklySP(),
        isMe: true,
      }
      const list: RankUser[] = state.friends.map((f) => ({
        id: f.id,
        name: f.name,
        level: f.level,
        faculty: f.faculty,
        weeklySP: f.weeklySP,
        monthlySP: f.weeklySP * 4,
      }))
      return [me, ...list].sort((a, b) => b.weeklySP - a.weeklySP)
    }

    const rankingWith: Store['rankingWith'] = (scope, faculty) => {
      const me: RankUser = {
        id: 'me',
        name: state.user.name,
        level: state.user.level,
        faculty: '経済学部',
        weeklySP: meWeeklySP(),
        monthlySP: state.user.sp,
        isMe: true,
      }
      let pool = [me, ...state.ranking]
      if (faculty && faculty !== '全体') pool = pool.filter((u) => u.faculty === faculty)
      const key = scope === 'weekly' ? 'weeklySP' : 'monthlySP'
      return [...pool].sort((a, b) => b[key] - a[key])
    }

    const reset: Store['reset'] = () => {
      localStorage.removeItem(STORAGE_KEY)
      setState(structuredClone(seedState))
    }

    return { state, expToNext, completeMission, claimDailyReward, redeemCoupon, rankingWith, friendRanking, reset }
  }, [state])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useApp(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within StoreProvider')
  return ctx
}
