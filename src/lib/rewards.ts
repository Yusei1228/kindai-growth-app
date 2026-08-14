// ===== 報酬（抽選券・ガチャ・受け取りBOX・クーポン）API =====
// すべてサーバー権威。書き込みはSupabaseのRPC（SECURITY DEFINER＋auth.uid()）経由で、
// 端末側の値を書き換えても不正に券を増やしたり使用済みを戻したりできない。

import { supabase, isSupabaseEnabled, ensureAnonAuth } from './supabase'

export interface RewardSummary {
  balance: number // 抽選券の残数
  weekSpins: number // 今週回したガチャ回数
  weekLimit: number // 週の上限（7）
  boxCount: number // 受け取りBOXの未受取件数
}

export interface RewardBoxItem {
  id: string
  kind: string // 協賛店舗特典 / 抽選報酬
  sponsor_name: string
  title: string
  emoji: string
  description: string
  expires_at: string
  created_at: string
}

export interface Coupon {
  id: string
  sponsor_name: string
  title: string
  emoji: string
  code: string
  issued_at: string
  expires_at: string
  used_at: string | null
}

export interface GachaResult {
  reward_kind: 'coupon' | 'sp' | 'exp'
  reward_id: string | null // coupon のときのみ（受け取りBOXの行id）
  amount: number // sp / exp のときの数量
  kind: string // 表示タグ（協賛店舗特典 / 抽選報酬 / ボーナス報酬）
  sponsor_name: string
  title: string
  emoji: string
  description: string
  expires_at: string | null
  balance: number
}

/** 匿名認証が有効で報酬機能が使えるか */
export async function rewardsAvailable(): Promise<boolean> {
  if (!isSupabaseEnabled) return false
  const uid = await ensureAnonAuth()
  return !!uid
}

async function ready(): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false
  const uid = await ensureAnonAuth()
  return !!uid
}

/** 抽選券を付与（1日1枚・サーバーが判定。ミッション達成時に呼ぶ。冪等） */
export async function grantDailyTicket(): Promise<void> {
  if (!(await ready())) return
  await supabase!.rpc('reward_grant_daily_ticket')
}

export async function getSummary(): Promise<RewardSummary | null> {
  if (!(await ready())) return null
  const { data, error } = await supabase!.rpc('reward_summary')
  if (error || !data) return null
  return { balance: data.balance, weekSpins: data.week_spins, weekLimit: data.week_limit, boxCount: data.box_count }
}

/** ガチャを回す（当選はサーバーが決定）。エラーコード: no_tickets / weekly_limit */
export async function spinGacha(): Promise<GachaResult> {
  if (!(await ready())) throw new Error('unavailable')
  const { data, error } = await supabase!.rpc('reward_spin_gacha')
  if (error) throw new Error(error.message)
  return data as GachaResult
}

export async function getRewardBox(): Promise<RewardBoxItem[]> {
  if (!(await ready())) return []
  const { data, error } = await supabase!
    .from('reward_box')
    .select('id,kind,sponsor_name,title,emoji,description,expires_at,created_at')
    .is('claimed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as RewardBoxItem[]
}

export async function claimReward(rewardId: string): Promise<void> {
  if (!(await ready())) throw new Error('unavailable')
  const { error } = await supabase!.rpc('reward_claim', { reward_id: rewardId })
  if (error) throw new Error(error.message)
}

export async function claimAllRewards(): Promise<number> {
  if (!(await ready())) return 0
  const { data, error } = await supabase!.rpc('reward_claim_all')
  if (error || !data) return 0
  return data.claimed ?? 0
}

export async function getCoupons(): Promise<Coupon[]> {
  if (!(await ready())) return []
  const { data, error } = await supabase!
    .from('reward_coupons')
    .select('id,sponsor_name,title,emoji,code,issued_at,expires_at,used_at')
    .order('issued_at', { ascending: false })
  if (error || !data) return []
  return data as Coupon[]
}

/** クーポンを使用（不可逆）。エラーコード: not_usable */
export async function useCoupon(couponId: string): Promise<void> {
  if (!(await ready())) throw new Error('unavailable')
  const { error } = await supabase!.rpc('reward_use_coupon', { coupon_id: couponId })
  if (error) throw new Error(error.message)
}

/** クーポンの状態を導出（未使用 / 使用済み / 期限切れ） */
export type CouponStatus = '未使用' | '使用済み' | '期限切れ'
export function couponStatus(c: Coupon): CouponStatus {
  if (c.used_at) return '使用済み'
  if (new Date(c.expires_at).getTime() < Date.now()) return '期限切れ'
  return '未使用'
}
