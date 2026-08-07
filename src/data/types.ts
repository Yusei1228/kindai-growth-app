// ===== KINDAI GROWTH ドメイン型定義 =====

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
  reward: Reward
  done: boolean
}

/** セルフミッションの定義（8種・2ステータス・時間比例報酬） */
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
}

/** レベルアップに必要なEXP（レベルに応じて増加） */
export function expForLevel(level: number): number {
  return 80 + level * 60
}
