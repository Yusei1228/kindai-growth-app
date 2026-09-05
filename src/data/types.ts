// ===== KINDAI GROWTH ドメイン型定義 =====

import type { LifeRouteId } from './lifeMap'

/** RPGステータス（努力カテゴリに対応）
 *  体力 = 運動 / 知力 = 勉強 / 活力 = 生活習慣 / 魅力 = 振り返り・継続
 */
export interface Stats {
  体力: number
  知力: number
  活力: number
  魅力: number
}

export type StatKey = keyof Stats
export type Category = '勉強' | '運動' | '生活習慣' | '振り返り'

/** ミッションがどのステータスを伸ばすか */
export const CATEGORY_TO_STAT: Record<Category, StatKey> = {
  勉強: '知力',
  運動: '体力',
  生活習慣: '活力',
  振り返り: '魅力',
}

export interface Reward {
  exp: number
  sp: number // シーズンPt（青いダイヤ）
  coins: number // ポイント（緑のP）
  stat: StatKey
  statAmount: number
}

export interface Mission {
  id: string
  title: string
  category: Category
  targetMinutes: number
  timed: boolean // true=時間指定タイマー / false=タイマー無し（感想入力へ）
  reward: Reward
  done: boolean
}

/** セルフミッションの定義（9種・2ステータス・時間比例報酬） */
export interface SelfMission {
  id: string
  title: string
  emoji: string
  category: Category // ログ・アイコン用の代表カテゴリ
  exp30: number // 30分あたりのEXP
  sp30: number // 30分あたりのSP（スコア）
  stats: StatKey[] // 上昇するステータス（1〜2種）
  timed: boolean // false = タイマーを飛ばしてレビューへ
}

/** タイマー/レビュー画面に渡す「実行中ミッション」情報（デイリー・セルフ共通） */
export interface ActiveMission {
  kind: 'daily' | 'self'
  missionId?: string // daily のみ（達成マーク・ボーナス判定用）
  self?: SelfMission // self のみ（報酬モデル）
  timed?: boolean // false=タイマー無しで直接レビューへ
  title: string
  category: Category
  targetMinutes: number // タイマーの目標時間（0=自由/カウントアップ）
  // daily 用の固定報酬（self は self から算出）
  rewardSp: number
  rewardExp: number
  statAmount: number
}

/** 実行ログ（振り返り・ランキング集計の元データ） */
export interface ActivityLog {
  id: string
  missionKey?: string // 種目の安定キー（self.id / daily.id）。8項目集計の主キー。旧ログはundefined
  missionTitle: string
  category: Category
  minutes: number
  spEarned: number
  rating: number // 1-5
  comment: string
  date: string // ISO yyyy-mm-dd
  at: number // timestamp
}

export interface Friend {
  id: string
  name: string
  level: number
  faculty: string // 学部
  weeklySP: number
  avatarColor: string
}

export interface RankUser {
  id: string
  name: string
  level: number
  faculty: string
  weeklySP: number
  monthlySP: number
  isMe?: boolean
}

export interface CouponStore {
  id: string
  name: string
  category: string
  title: string // クーポン名
  cost: number // 必要ポイント
  emoji: string
  distance: string
  redeemed: boolean
}

export interface UserState {
  userId: string // 匿名UUID（localStorage）
  registered: boolean // ニックネーム登録済みか
  name: string // ニックネーム
  avatar: string // 選択中のアバター画像ファイル名（public/直下）
  level: number
  exp: number
  streak: number // 連続日数
  totalDays: number // 累計達成日数
  sp: number // 累計スコア（total_score・ランキング基準）
  points: number // ポイント（緑のP・クーポン用）
  stats: Stats
  dailyRewardAvailable: boolean
  tutorialDone: boolean // 初回チュートリアルを完了したか
  facultyId?: number | null // 学部（近大マスタのid・任意）
  enrollmentYear?: number | null // 入学年度（学年別分析の前提・任意）
}

/** ログインボーナスの進捗（毎月リセット・最大30日分） */
export interface LoginBonusState {
  monthKey: string // 'YYYY-MM'（月替わりでリセット）
  claimedDays: number // 今月これまでに受け取った日数（0〜30）
  lastClaimDate: string // 最後に受け取った app_date（1日1回制限）
}

/** LIFE QUEST MAP：1マス達成の履歴（大学生活アルバムの元データ） */
export interface LifeHistoryEntry {
  routeId: LifeRouteId
  theme: string
  nodeId: string
  title: string // 置換後の実表示タイトル
  emoji: string
  kind: 'quest' | 'branch' | 'goal'
  at: number // timestamp
  date: string // app_date (yyyy-mm-dd)
}

/** LIFE QUEST MAP：ルートごとの進捗（すごろく／サイコロ進行・後でサーバー権威化しやすい形） */
export interface LifeRouteProgress {
  pos: number // アバターの現在マス（-1=START、0..last=盤面index）
  awaiting: boolean // 止まったマスの解決（行動達成/分岐選択/ゴール完了）待ちか
  variant: string | null // 選択した分岐ラベル（{v}に反映）
  done: boolean // ゴール到達済みか
  lastRoll?: number // 直近の出目（表示用）
}

export interface LifeMapState {
  routeId: LifeRouteId | null // 現在のメインクエスト
  progress: Record<string, LifeRouteProgress> // routeId -> 進捗
  history: LifeHistoryEntry[] // 達成履歴（新しい順）
  rollDay: string // ルーレットを回した app_date（日替わりでターン数リセット）
  rollsUsed: number // 今日これまでに回した回数（ボーナスマスは消費しない）
}

export interface AppState {
  user: UserState
  missions: Mission[]
  missionsDate: string // missions を生成した app_date
  logs: ActivityLog[]
  friends: Friend[]
  ranking: RankUser[]
  coupons: CouponStore[]
  challengeDaysLeft: number
  loginBonus: LoginBonusState
  lifeMap: LifeMapState // LIFE QUEST MAP の進捗
}

/** レベルアップに必要なEXP（レベルに応じて増加） */
export function expForLevel(level: number): number {
  return 80 + level * 60
}
