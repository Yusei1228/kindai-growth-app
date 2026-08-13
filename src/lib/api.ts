// ===== Supabase データアクセス層 =====
// 4テーブル（profiles / user_stats / mission_logs / daily_missions）への最小CRUD。
// Supabase未設定時はすべて no-op（ローカルのみで動作）。

import { supabase } from './supabase'
import type { Stats } from '../data/types'

/** アプリ内ステータス(体力/知力/活力/魅力) → DBカラム(intelligence/strength/vitality/charm) */
export function statsToDb(stats: Stats) {
  return {
    intelligence: stats.知力,
    strength: stats.体力,
    vitality: stats.活力,
    charm: stats.魅力,
  }
}

/** DBカラム → アプリ内ステータス */
export function statsFromDb(r: { strength?: number; intelligence?: number; vitality?: number; charm?: number }): Stats {
  return {
    体力: r.strength ?? 0,
    知力: r.intelligence ?? 0,
    活力: r.vitality ?? 0,
    魅力: r.charm ?? 0,
  }
}

export interface StatsSnapshot {
  level: number
  exp: number
  totalScore: number
  stats: Stats
}

export interface RankRow {
  userId: string
  nickname: string
  level: number
  totalScore: number
  avatar?: string | null
  exp?: number
  stats?: Stats
}

/** プロフィールを保証（登録・自己修復共通）。avatar を渡せば併せて更新 */
async function ensureProfile(userId: string, nickname: string, avatar?: string): Promise<boolean> {
  if (!supabase) return false
  const row: { id: string; nickname: string; avatar?: string } = { id: userId, nickname }
  if (avatar !== undefined) row.avatar = avatar
  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
  if (error) {
    console.warn('[supabase] profiles upsert failed:', error.message)
    return false
  }
  return true
}

/** アバターのみをDBへ反映（変更時） */
export async function syncAvatar(userId: string, nickname: string, avatar: string): Promise<void> {
  if (!supabase) return
  await ensureProfile(userId, nickname, avatar)
}

/** プロフィール＋初期ステータス(0pt)を作成（ニックネーム登録時＝即ランキング反映）。
 *  学部・入学年度は任意（近大=university_id:1 固定）。学年別分析の前提。 */
export async function registerProfile(
  userId: string,
  nickname: string,
  avatar?: string,
  facultyId?: number | null,
  enrollmentYear?: number | null,
): Promise<boolean> {
  if (!supabase) return false
  const row: Record<string, unknown> = { id: userId, nickname, university_id: 1 }
  if (avatar !== undefined) row.avatar = avatar
  if (facultyId != null) row.faculty_id = facultyId
  if (enrollmentYear != null) row.enrollment_year = enrollmentYear
  const { error: pErr } = await supabase.from('profiles').upsert(row, { onConflict: 'id' })
  if (pErr) {
    console.warn('[supabase] registerProfile upsert failed:', pErr.message)
    return false
  }
  const { error } = await supabase.from('user_stats').upsert(
    {
      user_id: userId,
      level: 1,
      exp: 0,
      total_score: 0,
      intelligence: 20,
      strength: 20,
      vitality: 20,
      charm: 20,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.warn('[supabase] user_stats(init) upsert failed:', error.message)
    return false
  }
  return true
}

/** ステータスをDBへ反映（ミッション達成後）。nicknameを渡すと登録漏れを自己修復する */
export async function syncStats(userId: string, snap: StatsSnapshot, nickname?: string, avatar?: string): Promise<void> {
  if (!supabase) return
  // プロフィールが無いと外部キー違反になるため、先に保証（自己修復・アバターも同期）
  if (nickname) await ensureProfile(userId, nickname, avatar)
  const { error } = await supabase.from('user_stats').upsert(
    {
      user_id: userId,
      level: snap.level,
      exp: snap.exp,
      total_score: snap.totalScore,
      ...statsToDb(snap.stats),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) console.warn('[supabase] syncStats failed:', error.message)
}

export interface MissionLogEntry {
  userId: string
  missionType: 'daily' | 'self'
  missionTitle: string
  category: string
  score: number
  exp: number
  appDate: string
  missionKey?: string // 種目の安定キー（分析用・後から取得不能）
  startedAt?: string // ISO（活動開始時刻）
  durationSeconds?: number // 実活動時間（秒）
  coinDelta?: number
  statKey?: string
  statDelta?: number
}

// ===== 達成ログの信頼性送信（アウトボックス方式・履歴を失わない） =====
// 端末側キューに積んでからDBへ送信。失敗した分は localStorage に残り、次回に自動再送。
const OUTBOX_KEY = 'kindai-growth-log-outbox'
type LogRow = Record<string, unknown>

function readOutbox(): LogRow[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]')
  } catch {
    return []
  }
}
function writeOutbox(rows: LogRow[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(rows.slice(-300)))
  } catch {
    /* noop */
  }
}

let flushing = false
/** 未送信ログを1件ずつ再送（失敗分は残す）。起動時・達成時に呼ぶ */
export async function flushLogOutbox(): Promise<void> {
  if (!supabase || flushing) return
  flushing = true
  try {
    const rows = readOutbox()
    if (!rows.length) return
    const remaining: LogRow[] = []
    for (const row of rows) {
      const { error } = await supabase.from('mission_logs').insert(row)
      if (error) remaining.push(row) // 失敗は次回へ持ち越し
    }
    writeOutbox(remaining)
  } finally {
    flushing = false
  }
}

/** 達成ログを保存（まずキューに積み、DBへ送信。失敗しても消えない） */
export async function logMission(entry: MissionLogEntry): Promise<void> {
  const row: LogRow = {
    user_id: entry.userId,
    mission_type: entry.missionType,
    mission_title: entry.missionTitle,
    category: entry.category,
    score: entry.score,
    exp: entry.exp,
    completed_at: new Date().toISOString(),
    app_date: entry.appDate,
    mission_key: entry.missionKey ?? null,
    started_at: entry.startedAt ?? null,
    duration_seconds: entry.durationSeconds ?? null,
    coin_delta: entry.coinDelta ?? null,
    stat_key: entry.statKey ?? null,
    stat_delta: entry.statDelta ?? null,
  }
  const rows = readOutbox()
  rows.push(row)
  writeOutbox(rows)
  await flushLogOutbox()
}

/** 全ユーザーの累計スコア降順ランキングを取得 */
export async function fetchRanking(): Promise<RankRow[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('user_stats')
    .select('user_id, level, exp, total_score, strength, intelligence, vitality, charm, profiles(nickname, avatar)')
    .order('total_score', { ascending: false })
    .limit(500)
  if (error || !data) return null
  return data.map((r: any) => ({
    userId: r.user_id,
    nickname: r.profiles?.nickname ?? '名無し',
    avatar: r.profiles?.avatar ?? null,
    level: r.level ?? 1,
    exp: r.exp ?? 0,
    totalScore: r.total_score ?? 0,
    stats: statsFromDb(r),
  }))
}

export interface RankRowRanked extends RankRow {
  rank: number
}
export interface RankBoard {
  total: number
  myRank: number | null
  top: RankRowRanked[]
  around: RankRowRanked[]
}

/** サーバ集計RPCでランキングを取得（全件取得しない＝6,000人でも低コスト・正確） */
export async function fetchRankingBoard(me: string, win = 5, topn = 50): Promise<RankBoard | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('get_ranking', { me, win, topn })
  if (error || !data) {
    console.warn('[supabase] get_ranking failed:', error?.message)
    return null
  }
  const map = (r: any): RankRowRanked => ({
    userId: r.userId,
    nickname: r.nickname ?? '名無し',
    avatar: r.avatar ?? null,
    level: r.level ?? 1,
    totalScore: r.totalScore ?? 0,
    stats: statsFromDb(r),
    rank: r.rnk ?? 0,
  })
  return {
    total: data.total ?? 0,
    myRank: data.myRank ?? null,
    top: (data.top || []).map(map),
    around: (data.around || []).map(map),
  }
}
