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
}

/** プロフィールを保証（登録・自己修復共通） */
async function ensureProfile(userId: string, nickname: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('profiles').upsert({ id: userId, nickname }, { onConflict: 'id' })
  if (error) {
    console.warn('[supabase] profiles upsert failed:', error.message)
    return false
  }
  return true
}

/** プロフィール＋初期ステータス(0pt)を作成（ニックネーム登録時＝即ランキング反映） */
export async function registerProfile(userId: string, nickname: string): Promise<boolean> {
  if (!supabase) return false
  const ok = await ensureProfile(userId, nickname)
  if (!ok) return false
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
export async function syncStats(userId: string, snap: StatsSnapshot, nickname?: string): Promise<void> {
  if (!supabase) return
  // プロフィールが無いと外部キー違反になるため、先に保証（自己修復）
  if (nickname) await ensureProfile(userId, nickname)
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
}

/** 達成ログを保存 */
export async function logMission(entry: MissionLogEntry): Promise<void> {
  if (!supabase) return
  await supabase.from('mission_logs').insert({
    user_id: entry.userId,
    mission_type: entry.missionType,
    mission_title: entry.missionTitle,
    category: entry.category,
    score: entry.score,
    exp: entry.exp,
    completed_at: new Date().toISOString(),
    app_date: entry.appDate,
  })
}

/** 全ユーザーの累計スコア降順ランキングを取得 */
export async function fetchRanking(): Promise<RankRow[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('user_stats')
    .select('user_id, level, total_score, profiles(nickname)')
    .order('total_score', { ascending: false })
    .limit(500)
  if (error || !data) return null
  return data.map((r: any) => ({
    userId: r.user_id,
    nickname: r.profiles?.nickname ?? '名無し',
    level: r.level ?? 1,
    totalScore: r.total_score ?? 0,
  }))
}
