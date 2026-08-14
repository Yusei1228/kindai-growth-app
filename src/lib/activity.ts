// ===== 振り返り用：記録ログを「8項目」に集計する =====
// すべて端末内（localStorageの自分のログ）で完結する軽量処理。
// ネットワーク・DBアクセスは一切なし → 6000人規模でもサーバー負荷ゼロ。

import { SELF_MISSIONS } from '../data/selfMissions'
import type { ActivityLog, Category } from '../data/types'

export interface ActivityItem {
  id: string // セルフミッションのid（study/english…）または 'other'
  title: string
  emoji: string
  category: Category
}

// 振り返りの主役＝セルフミッション8項目（定義順を維持）
export const ACTIVITY_ITEMS: ActivityItem[] = SELF_MISSIONS.map((m) => ({
  id: m.id,
  title: m.title,
  emoji: m.emoji,
  category: m.category,
}))

// 8項目に当てはまらないデイリー記録（水分・片付け等）の受け皿
export const OTHER_ITEM: ActivityItem = { id: 'other', title: 'その他の記録', emoji: '📋', category: '生活習慣' }

const SELF_IDS = new Set(SELF_MISSIONS.map((m) => m.id))
const BY_TITLE = new Map(SELF_MISSIONS.map((m) => [m.title, m.id]))

/** 1件のログを8項目（またはother）のidに割り当てる。
 *  優先度：missionKey一致 → タイトル完全一致 → キーワード推定 → カテゴリ。 */
export function attributeLog(log: ActivityLog): string {
  // 1) 新ログ：missionKey が セルフミッションid と一致（最も正確）
  if (log.missionKey && SELF_IDS.has(log.missionKey)) return log.missionKey
  // 2) タイトル完全一致（セルフミッションの旧ログを救済）
  const byTitle = BY_TITLE.get(log.missionTitle)
  if (byTitle) return byTitle
  // 3) キーワード推定（主にデイリーミッション）。順序が重要：読書→英語→勉強
  const t = log.missionTitle
  if (/読書|読む/.test(t)) return 'reading'
  if (/英語|英単語|英会話|TOEIC|英/.test(t)) return 'english'
  if (/勉強|資格|テスト|試験|ノート|授業|課題|レポート|単語/.test(t)) return 'study'
  if (/バイト|アルバイト/.test(t)) return 'baito'
  if (/部活|サークル/.test(t)) return 'club'
  if (/ラン|走|歩|ジョグ|散歩/.test(t)) return 'running'
  if (/筋トレ|腕立|腹筋|スクワット|ストレッチ|運動/.test(t)) return 'kintore'
  if (/振り返|日記|感謝|目標|交流|挑戦/.test(t)) return 'social'
  // 4) カテゴリからの最終フォールバック（生活習慣の雑多な項目は other へ）
  if (log.category === '勉強') return 'study'
  if (log.category === '運動') return 'kintore'
  if (log.category === '振り返り') return 'social'
  return 'other'
}

export interface ItemAgg {
  item: ActivityItem
  count: number // 記録回数
  minutes: number // 合計時間（分）
  sp: number // 獲得SP
  lastComment?: string // 直近の振り返りコメント（logsは新しい順前提）
}

/** ログ配列を8項目（+other）に集計。8項目は0回でも必ず含む（未着手の可視化のため）。 */
export function aggregateByItem(logs: ActivityLog[]): ItemAgg[] {
  const map = new Map<string, ItemAgg>()
  for (const it of ACTIVITY_ITEMS) map.set(it.id, { item: it, count: 0, minutes: 0, sp: 0 })
  for (const log of logs) {
    const id = attributeLog(log)
    let agg = map.get(id)
    if (!agg) {
      agg = { item: OTHER_ITEM, count: 0, minutes: 0, sp: 0 }
      map.set('other', agg)
    }
    agg.count += 1
    agg.minutes += log.minutes
    agg.sp += log.spEarned
    if (!agg.lastComment && log.comment) agg.lastComment = log.comment
  }
  return [...map.values()]
}
