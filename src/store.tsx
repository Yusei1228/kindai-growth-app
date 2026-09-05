import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppState, Category, LifeHistoryEntry, Mission, RankUser, SelfMission, StatKey } from './data/types'
import { CATEGORY_TO_STAT, expForLevel } from './data/types'
import { getLifeRoute, getBoard, isAutoNode, applyVariant, LIFE_DAILY_ROLLS, type LifeRouteId, type LifeNode } from './data/lifeMap'
import { seedState } from './data/seed'
import { pickDailyMissions, DAILY_REWARD } from './data/dailyPool'
import { selfMissionReward, SELF_COINS } from './data/selfMissions'
import { loginBonusReward, loginMonthKey, LOGIN_BONUS_DAYS } from './data/loginBonus'
import { TUTORIAL_MISSION_ID, TUTORIAL_REWARD, tutorialMission } from './data/tutorial'
import { appDate } from './lib/appDate'
import { getUserId } from './lib/session'
import { registerProfile, syncStats, logMission, syncAvatar, flushLogOutbox } from './lib/api'
import { grantDailyTicket } from './lib/rewards'
import { syncMyProfile } from './lib/friends'
import { normalizeAvatar } from './data/avatars'

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
  // 初回チュートリアル完了フラグの補正：既存ユーザー（実績あり）はスキップ、新規のみ表示
  if (typeof s.user.tutorialDone !== 'boolean') {
    s.user.tutorialDone = s.logs?.length > 0 || s.user.sp > 0 || s.user.level > 1
  }

  const today = appDate()
  const oldFormat = s.missions?.some((m) => (m as { timed?: boolean }).timed === undefined)
  if (s.missionsDate !== today || !s.missions?.length || oldFormat) {
    s.missions = pickDailyMissions(today)
    s.missionsDate = today
    s.user.dailyRewardAvailable = true
  }
  // 初回ユーザーはデイリー先頭に「チュートリアルミッション」を差し込む（完了で消える）
  s.missions = s.missions.filter((m) => m.id !== TUTORIAL_MISSION_ID)
  if (!s.user.tutorialDone) s.missions = [tutorialMission(), ...s.missions]
  s.user.avatar = normalizeAvatar(s.user.avatar) // 旧データにavatarが無い場合の補正

  // ログインボーナス：未初期化 or 月替わりでリセット（毎月30日分）
  const month = loginMonthKey(today)
  if (!s.loginBonus || s.loginBonus.monthKey !== month) {
    s.loginBonus = { monthKey: month, claimedDays: 0, lastClaimDate: '' }
  }
  // LIFE QUEST MAP：旧セーブに無ければ初期化
  if (!s.lifeMap || typeof s.lifeMap !== 'object') {
    s.lifeMap = { routeId: null, progress: {}, history: [], rollDay: '', rollsUsed: 0 }
  }
  if (!s.lifeMap.progress) s.lifeMap.progress = {}
  if (!Array.isArray(s.lifeMap.history)) s.lifeMap.history = []
  if (typeof s.lifeMap.rollDay !== 'string') s.lifeMap.rollDay = ''
  if (typeof s.lifeMap.rollsUsed !== 'number') s.lifeMap.rollsUsed = 0
  // 旧スキーマ（index基準）の進捗は、すごろく（pos基準）へ作り直す
  for (const k of Object.keys(s.lifeMap.progress)) {
    const p = s.lifeMap.progress[k] as { pos?: number }
    if (!p || typeof p.pos !== 'number') s.lifeMap.progress[k] = { pos: -1, awaiting: false, variant: null, done: false }
  }
  return s
}

interface CompleteDailyPayload {
  missionId: string
  minutes: number
  rating: number
  comment: string
  startedAtMs?: number // 活動開始時刻（タイマー由来）
}

interface CompleteSelfPayload {
  mission: SelfMission
  minutes: number
  comment: string
  rating?: number
  startedAtMs?: number // 活動開始時刻（タイマー由来）
}

interface CompleteResult {
  leveledUp: boolean
  newLevel: number
  gainedSP: number
  dailyBonus: boolean
}

interface LoginBonusResult {
  day: number // 受け取った日目（1〜30）
  sp: number
  exp: number
  milestone: boolean
  leveledUp: boolean
  newLevel: number
}

/** LIFE MAP：ルーレットを回した結果（マイターン） */
interface LifeRollResult {
  ok: boolean
  noTurns?: boolean // 今日のターンを使い切っていて回せなかった
  roll: number // 出目（1-6）
  from: number // 移動前マス
  to: number // 移動後マス
  landedKind: LifeNode['kind']
  landedEmoji: string
  auto: boolean // 占い/イベント/ボーナス/休憩/中間ゴール＝自動解決済みか
  bonusSpin: boolean // 「もう1回」＝ターンを消費しなかった
  gainedSP: number
  gainedExp: number
  leveledUp: boolean
  newLevel: number
  title: string
  done: boolean
}

/** LIFE MAP：止まったマスの解決（行動達成/分岐選択/ゴール完了）結果 */
interface LifeResolveResult {
  ok: boolean
  isBranch: boolean
  isGoal: boolean
  gainedSP: number
  gainedExp: number
  leveledUp: boolean
  newLevel: number
  done: boolean
  title: string
}

interface Store {
  state: AppState
  expToNext: number
  /** ニックネーム登録（UUID発行・profiles/user_stats作成） */
  register: (nickname: string, facultyId?: number | null, enrollmentYear?: number | null) => void
  /** アバター画像を変更（localStorageに保存） */
  setAvatar: (file: string) => void
  /** デイリーミッション達成 */
  completeDaily: (p: CompleteDailyPayload) => CompleteResult
  /** セルフミッション達成 */
  completeSelf: (p: CompleteSelfPayload) => CompleteResult
  /** 初回チュートリアル完了（EXP+SP付与・Lv1→Lv2） */
  completeTutorial: () => CompleteResult
  claimDailyReward: () => void
  /** 今日のログインボーナスを受け取れるか */
  loginBonusAvailable: boolean
  /** ログインボーナスを受け取る（受け取れない場合は null） */
  claimLoginBonus: () => LoginBonusResult | null
  redeemCoupon: (couponId: string) => boolean
  /** ガチャのSP/EXP当選をゲーム状態に反映（レベルアップ対応） */
  applyGachaReward: (kind: 'sp' | 'exp', amount: number) => { leveledUp: boolean; newLevel: number }
  /** 学内ランキング（ローカル・Supabase未設定時のフォールバック用） */
  rankingWith: (scope: 'weekly' | 'monthly', faculty?: string) => RankUser[]
  friendRanking: () => RankUser[]
  /** LIFE MAP：今日あと何回まわせるか（日替わりリセット） */
  lifeRollsLeft: number
  /** LIFE MAP：メインクエスト（ルート）を選択（進捗は保持） */
  selectLifeRoute: (routeId: LifeRouteId) => void
  /** LIFE MAP：ルーレットを回してキャラを進める（マイターン）。forced=出目指定（演出同期用）。 */
  rollLifeDice: (forced?: number) => LifeRollResult
  /** LIFE MAP：止まったマスを解決（行動達成 / 分岐は choiceLabel / ゴール完了）。 */
  resolveLifeSquare: (choiceLabel?: string) => LifeResolveResult
  /** LIFE MAP：現在（または指定）ルートを最初からやり直す */
  resetLifeRoute: (routeId?: LifeRouteId) => void
  reset: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // 起動時に一度、登録済みユーザーをDBへ反映（登録漏れ・シード状態の自己修復・即ランキング反映）
  useEffect(() => {
    const u = state.user
    if (u.registered && u.userId) {
      syncStats(u.userId, { level: u.level, exp: u.exp, totalScore: u.sp, stats: u.stats }, u.name, u.avatar)
      // フレンドID（friend_code）を自動付与／既存アカウントにも起動時にバックフィル
      syncMyProfile({ nickname: u.name || 'あなた', avatar: u.avatar, level: u.level, totalScore: u.sp })
    }
    // 未送信の達成ログを再送（履歴を失わない）
    flushLogOutbox()
    // 今日すでにミッションを達成済みなら抽選券を付与（サーバー側で1日1枚・冪等）
    if (state.logs.some((l) => l.date === appDate())) grantDailyTicket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const store: Store = useMemo(() => {
    const expToNext = expForLevel(state.user.level) - state.user.exp
    const lmToday = appDate()
    const lifeUsed = state.lifeMap.rollDay === lmToday ? state.lifeMap.rollsUsed : 0
    const lifeRollsLeft = Math.max(0, LIFE_DAILY_ROLLS - lifeUsed)

    /** 報酬を適用した次状態と結果を返す共通ロジック */
    function applyReward(
      prev: AppState,
      opts: {
        type: 'daily' | 'self'
        title: string
        missionKey?: string
        category: Category
        minutes: number
        comment: string
        rating: number
        sp: number
        exp: number
        coins: number
        statBoosts: Partial<Record<StatKey, number>>
        markMissionId?: string
        allDailyBonus: boolean
      },
    ): { next: AppState; result: CompleteResult } {
      const u = { ...prev.user, stats: { ...prev.user.stats } }

      let gainedSP = opts.sp
      let gainedExp = opts.exp

      // デイリー3件全達成ボーナス（+50スコア）
      let dailyBonus = false
      let missions = prev.missions
      if (opts.markMissionId) {
        missions = prev.missions.map((m) => (m.id === opts.markMissionId ? { ...m, done: true } : m))
        const dailyOnly = missions.filter((m) => m.id !== TUTORIAL_MISSION_ID)
        if (opts.allDailyBonus && dailyOnly.length > 0 && dailyOnly.every((m) => m.done)) {
          dailyBonus = true
          gainedSP += 50
        }
      }

      u.sp += gainedSP
      u.exp += gainedExp
      u.points += opts.coins
      for (const [k, amt] of Object.entries(opts.statBoosts)) {
        const key = k as StatKey
        u.stats[key] = Math.min(100, u.stats[key] + (amt ?? 0))
      }

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
        missionKey: opts.missionKey,
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

    interface LogExtra {
      missionKey?: string
      startedAtMs?: number
      durationSeconds?: number
      coinDelta?: number
      statKey?: StatKey
      statDelta?: number
    }
    /** DBへ非同期反映（達成ログはアウトボックスで信頼送信・ステータスはupsert） */
    function pushToDb(next: AppState, type: 'daily' | 'self', title: string, category: Category, sp: number, exp: number, extra?: LogExtra) {
      const u = next.user
      if (!u.userId) return
      const durationSeconds = extra?.durationSeconds
      const startedAt = extra?.startedAtMs
        ? new Date(extra.startedAtMs).toISOString()
        : durationSeconds
          ? new Date(Date.now() - durationSeconds * 1000).toISOString()
          : undefined
      logMission({
        userId: u.userId,
        missionType: type,
        missionTitle: title,
        category,
        score: sp,
        exp,
        appDate: appDate(),
        missionKey: extra?.missionKey,
        startedAt,
        durationSeconds,
        coinDelta: extra?.coinDelta,
        statKey: extra?.statKey,
        statDelta: extra?.statDelta,
      })
      syncStats(u.userId, { level: u.level, exp: u.exp, totalScore: u.sp, stats: u.stats }, u.name, u.avatar)
    }

    const register: Store['register'] = (nickname, facultyId = null, enrollmentYear = null) => {
      const userId = getUserId()
      setState((prev) => ({ ...prev, user: { ...prev.user, userId, name: nickname.trim(), registered: true, facultyId, enrollmentYear } }))
      registerProfile(userId, nickname.trim(), state.user.avatar, facultyId, enrollmentYear)
      // 登録と同時にフレンドID（friend_code）を自動作成
      syncMyProfile({ nickname: nickname.trim(), avatar: state.user.avatar, level: state.user.level, totalScore: state.user.sp })
    }

    const setAvatar: Store['setAvatar'] = (file) => {
      const av = normalizeAvatar(file)
      setState((prev) => ({ ...prev, user: { ...prev.user, avatar: av } }))
      const u = state.user
      if (u.registered && u.userId) syncAvatar(u.userId, u.name, av)
    }

    const completeDaily: Store['completeDaily'] = ({ missionId, minutes, rating, comment, startedAtMs }) => {
      const mission = state.missions.find((m) => m.id === missionId)
      let result: CompleteResult = { leveledUp: false, newLevel: state.user.level, gainedSP: 0, dailyBonus: false }
      if (!mission) return result
      const stat = CATEGORY_TO_STAT[mission.category]
      setState((prev) => {
        const { next, result: r } = applyReward(prev, {
          type: 'daily',
          title: mission.title,
          missionKey: mission.id,
          category: mission.category,
          minutes,
          comment,
          rating,
          sp: DAILY_REWARD.sp,
          exp: DAILY_REWARD.exp,
          coins: DAILY_REWARD.coins,
          statBoosts: { [stat]: DAILY_REWARD.statAmount },
          markMissionId: missionId,
          allDailyBonus: true,
        })
        result = r
        pushToDb(next, 'daily', mission.title, mission.category, r.gainedSP, DAILY_REWARD.exp, {
          missionKey: mission.id,
          startedAtMs,
          durationSeconds: minutes > 0 ? minutes * 60 : undefined,
          coinDelta: DAILY_REWARD.coins,
          statKey: stat,
          statDelta: DAILY_REWARD.statAmount,
        })
        return next
      })
      grantDailyTicket() // その日の達成で抽選券を付与（サーバーで1日1枚・冪等）
      return result
    }

    const completeSelf: Store['completeSelf'] = ({ mission, minutes, comment, rating = 0, startedAtMs }) => {
      let result: CompleteResult = { leveledUp: false, newLevel: state.user.level, gainedSP: 0, dailyBonus: false }
      const rw = selfMissionReward(mission, minutes) // 時間比例（timed=false は固定）
      const statBoosts: Partial<Record<StatKey, number>> = {}
      for (const s of mission.stats) statBoosts[s] = rw.statAmount
      setState((prev) => {
        const { next, result: r } = applyReward(prev, {
          type: 'self',
          title: mission.title,
          missionKey: mission.id,
          category: mission.category,
          minutes,
          comment,
          rating,
          sp: rw.sp,
          exp: rw.exp,
          coins: SELF_COINS,
          statBoosts,
          allDailyBonus: false,
        })
        result = r
        pushToDb(next, 'self', mission.title, mission.category, rw.sp, rw.exp, {
          missionKey: mission.id,
          startedAtMs,
          durationSeconds: minutes > 0 ? minutes * 60 : undefined,
          coinDelta: SELF_COINS,
          statKey: mission.stats[0],
          statDelta: rw.statAmount,
        })
        return next
      })
      grantDailyTicket() // その日の達成で抽選券を付与（サーバーで1日1枚・冪等）
      return result
    }

    const today0 = appDate()
    const lb = state.loginBonus
    const loginBonusAvailable = lb.claimedDays < LOGIN_BONUS_DAYS && lb.lastClaimDate !== today0

    const claimLoginBonus: Store['claimLoginBonus'] = () => {
      const today = appDate()
      if (state.loginBonus.claimedDays >= LOGIN_BONUS_DAYS || state.loginBonus.lastClaimDate === today) return null
      const day = state.loginBonus.claimedDays + 1
      const rw = loginBonusReward(day)
      let leveledUp = false
      let newLevel = state.user.level
      setState((prev) => {
        // 同一日に二重取得しない（並行クリック対策）
        if (prev.loginBonus.lastClaimDate === today || prev.loginBonus.claimedDays >= LOGIN_BONUS_DAYS) return prev
        const u = { ...prev.user }
        u.sp += rw.sp
        u.exp += rw.exp
        while (u.exp >= expForLevel(u.level)) {
          u.exp -= expForLevel(u.level)
          u.level += 1
          u.points += 20
          leveledUp = true
        }
        newLevel = u.level
        const next: AppState = {
          ...prev,
          user: u,
          loginBonus: { ...prev.loginBonus, claimedDays: day, lastClaimDate: today },
        }
        if (u.userId) syncStats(u.userId, { level: u.level, exp: u.exp, totalScore: u.sp, stats: u.stats }, u.name, u.avatar)
        return next
      })
      return { day, sp: rw.sp, exp: rw.exp, milestone: rw.milestone, leveledUp, newLevel }
    }

    const completeTutorial: Store['completeTutorial'] = () => {
      let result: CompleteResult = { leveledUp: false, newLevel: state.user.level, gainedSP: 0, dailyBonus: false }
      setState((prev) => {
        if (prev.user.tutorialDone) return prev
        const { next, result: r } = applyReward(prev, {
          type: 'daily',
          title: 'アプリの使い方（チュートリアル）',
          missionKey: 'tutorial',
          category: '振り返り',
          minutes: 0,
          comment: '使い方を確認した',
          rating: 5,
          sp: TUTORIAL_REWARD.sp,
          exp: TUTORIAL_REWARD.exp,
          coins: TUTORIAL_REWARD.coins,
          statBoosts: { 体力: TUTORIAL_REWARD.statAmount, 知力: TUTORIAL_REWARD.statAmount, 活力: TUTORIAL_REWARD.statAmount, 魅力: TUTORIAL_REWARD.statAmount },
          markMissionId: TUTORIAL_MISSION_ID,
          allDailyBonus: false,
        })
        next.user = { ...next.user, tutorialDone: true }
        result = r
        pushToDb(next, 'daily', 'チュートリアル', '振り返り', r.gainedSP, TUTORIAL_REWARD.exp)
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

    const applyGachaReward: Store['applyGachaReward'] = (kind, amount) => {
      let leveledUp = false
      let newLevel = state.user.level
      setState((prev) => {
        const u = { ...prev.user, stats: { ...prev.user.stats } }
        if (kind === 'sp') {
          u.sp += amount
        } else {
          u.exp += amount
          while (u.exp >= expForLevel(u.level)) {
            u.exp -= expForLevel(u.level)
            u.level += 1
            u.points += 20
            leveledUp = true
          }
        }
        newLevel = u.level
        if (u.userId) syncStats(u.userId, { level: u.level, exp: u.exp, totalScore: u.sp, stats: u.stats }, u.name, u.avatar)
        return { ...prev, user: u }
      })
      return { leveledUp, newLevel }
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

    // EXPからレベルアップを処理（複数繰り上がり対応）。u を破壊的に更新し、上がったか返す。
    function levelUpInPlace(u: AppState['user']): boolean {
      let leveled = false
      while (u.exp >= expForLevel(u.level)) {
        u.exp -= expForLevel(u.level)
        u.level += 1
        u.points += 20
        leveled = true
      }
      return leveled
    }
    function lifeHist(rid: LifeRouteId, theme: string, node: LifeNode, variant: string | null): LifeHistoryEntry {
      return { routeId: rid, theme, nodeId: node.id, title: applyVariant(node.title, variant), emoji: node.emoji, kind: node.kind === 'goal' || node.kind === 'branch' ? node.kind : 'quest', at: Date.now(), date: appDate() }
    }

    const selectLifeRoute: Store['selectLifeRoute'] = (routeId) => {
      setState((prev) => {
        const progress = { ...prev.lifeMap.progress }
        if (!progress[routeId]) progress[routeId] = { pos: -1, awaiting: false, variant: null, done: false }
        return { ...prev, lifeMap: { ...prev.lifeMap, routeId, progress } }
      })
    }

    const rollLifeDice: Store['rollLifeDice'] = (forced) => {
      let out: LifeRollResult = { ok: false, roll: 0, from: -1, to: -1, landedKind: 'quest', landedEmoji: '', auto: false, bonusSpin: false, gainedSP: 0, gainedExp: 0, leveledUp: false, newLevel: state.user.level, title: '', done: false }
      setState((prev) => {
        const rid = prev.lifeMap.routeId
        const route = getLifeRoute(rid)
        const board = getBoard(rid)
        if (!rid || !route || !board.length) return prev
        const pm = { ...prev.lifeMap.progress }
        const p = pm[rid] ?? { pos: -1, awaiting: false, variant: null, done: false }
        if (p.awaiting || p.done) return prev // 解決待ち/完了中は回せない

        // 日替わりでターン数リセット。今日の残ターンが無ければ回せない。
        const today = appDate()
        const usedToday = prev.lifeMap.rollDay === today ? prev.lifeMap.rollsUsed : 0
        if (usedToday >= LIFE_DAILY_ROLLS) {
          out = { ...out, noTurns: true }
          return prev
        }

        const last = board.length - 1
        const roll = forced && forced >= 1 && forced <= 6 ? forced : 1 + Math.floor(Math.random() * 6)
        let to = Math.min(p.pos + roll, last)
        // 人生ゲームの分岐/チェックポイントは強制停止（飛び越えない）
        for (let j = p.pos + 1; j <= to; j++) {
          if (board[j].kind === 'branch' || board[j].kind === 'milestone') {
            to = j
            break
          }
        }
        const node = board[to]
        const auto = isAutoNode(node.kind)
        const bonusSpin = !!node.bonusSpin

        const u = { ...prev.user, stats: { ...prev.user.stats } }
        let gainedSP = 0
        let gainedExp = 0
        let leveled = false
        let history = prev.lifeMap.history

        if (auto) {
          // 占い/イベント/ボーナス/休憩/中間ゴール：自動で報酬 → 演出
          gainedSP = node.sp
          gainedExp = node.exp
          u.sp += gainedSP
          u.exp += gainedExp
          if (node.points) u.points += node.points
          if (node.stat) {
            const stat = CATEGORY_TO_STAT[node.category]
            u.stats[stat] = Math.min(100, u.stats[stat] + node.stat)
          }
          leveled = levelUpInPlace(u)
          history = [lifeHist(rid, route.theme, node, p.variant), ...history].slice(0, 300)
        }
        // quest/branch/goal は awaiting=true（報酬は解決時に付与）
        pm[rid] = { pos: to, awaiting: !auto, variant: p.variant, done: false, lastRoll: roll }

        // ターン消費（ボーナスマスは消費しない＝もう1回）
        const rollsUsed = bonusSpin ? usedToday : usedToday + 1

        const next: AppState = { ...prev, user: u, lifeMap: { ...prev.lifeMap, progress: pm, history, rollDay: today, rollsUsed } }
        if (auto && u.userId) syncStats(u.userId, { level: u.level, exp: u.exp, totalScore: u.sp, stats: u.stats }, u.name, u.avatar)
        out = { ok: true, roll, from: p.pos, to, landedKind: node.kind, landedEmoji: node.emoji, auto, bonusSpin, gainedSP, gainedExp, leveledUp: leveled, newLevel: u.level, title: applyVariant(node.title, p.variant), done: false }
        return next
      })
      return out
    }

    const resolveLifeSquare: Store['resolveLifeSquare'] = (choiceLabel) => {
      let out: LifeResolveResult = { ok: false, isBranch: false, isGoal: false, gainedSP: 0, gainedExp: 0, leveledUp: false, newLevel: state.user.level, done: false, title: '' }
      setState((prev) => {
        const rid = prev.lifeMap.routeId
        const route = getLifeRoute(rid)
        const board = getBoard(rid)
        if (!rid || !route || !board.length) return prev
        const pm = { ...prev.lifeMap.progress }
        const p = pm[rid]
        if (!p || !p.awaiting) return prev
        const node = board[p.pos]
        if (!node) return prev

        const u = { ...prev.user, stats: { ...prev.user.stats } }
        let variant = p.variant
        let gainedSP = 0
        let gainedExp = 0

        if (node.kind === 'branch') {
          // 分岐：選択を記録（{v}反映）。SPなし・小EXP。
          variant = choiceLabel ?? node.choices?.[0]?.label ?? null
          gainedExp = node.exp
        } else {
          // クエスト/ゴール：現実行動の結果として SP/EXP/ステータス/コイン
          gainedSP = node.sp
          gainedExp = node.exp
          const stat = CATEGORY_TO_STAT[node.category]
          u.stats[stat] = Math.min(100, u.stats[stat] + node.stat)
          u.points += 2
        }
        u.sp += gainedSP
        u.exp += gainedExp
        const leveled = levelUpInPlace(u)
        const done = node.kind === 'goal' || p.pos >= board.length - 1

        pm[rid] = { ...p, awaiting: false, variant, done }
        const history = [lifeHist(rid, route.theme, node, variant), ...prev.lifeMap.history].slice(0, 300)
        const next: AppState = { ...prev, user: u, lifeMap: { ...prev.lifeMap, progress: pm, history } }
        if (u.userId) syncStats(u.userId, { level: u.level, exp: u.exp, totalScore: u.sp, stats: u.stats }, u.name, u.avatar)
        out = { ok: true, isBranch: node.kind === 'branch', isGoal: node.kind === 'goal', gainedSP, gainedExp, leveledUp: leveled, newLevel: u.level, done, title: applyVariant(node.title, variant) }
        return next
      })
      return out
    }

    const resetLifeRoute: Store['resetLifeRoute'] = (routeId) => {
      setState((prev) => {
        const rid = routeId ?? prev.lifeMap.routeId
        if (!rid) return prev
        const progress = { ...prev.lifeMap.progress, [rid]: { pos: -1, awaiting: false, variant: null, done: false } }
        return { ...prev, lifeMap: { ...prev.lifeMap, progress } }
      })
    }

    const reset: Store['reset'] = () => {
      localStorage.removeItem(STORAGE_KEY)
      setState(loadState())
    }

    return { state, expToNext, register, setAvatar, completeDaily, completeSelf, completeTutorial, claimDailyReward, loginBonusAvailable, claimLoginBonus, redeemCoupon, applyGachaReward, rankingWith, friendRanking, lifeRollsLeft, selectLifeRoute, rollLifeDice, resolveLifeSquare, resetLifeRoute, reset }
  }, [state])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useApp(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within StoreProvider')
  return ctx
}
