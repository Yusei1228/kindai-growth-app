// ===== フレンド機能 API（フレンド／申請／ランキング／すれ違い／足跡／現在地共有） =====
// 設計：報酬機能と同じ「Supabase匿名認証(auth.uid())＋RLS＋RPC」のサーバー権威。
// 他人の進捗・申請・位置を改ざんできない。位置は粗い座標（約100m）を短期保持し、
// サーバーが近接＋直近をマッチして encounters を作る。申請は10分以内のすれ違いのみ許可。
//
// Supabase未接続時は「ローカル・デモモード」で動作（UI確認・オフライン用のダミー）。

import { supabase, isSupabaseEnabled, ensureAnonAuth } from './supabase'

export interface FriendUser {
  userId: string
  code?: string
  nickname: string
  avatar?: string | null
  level: number
  totalScore: number
  instagram?: string | null
}
export interface IncomingRequest {
  id: string
  from: FriendUser
  at: string
}
export type EncounterStatus = 'none' | 'requested' | 'friend' | 'self'
export interface Encounter {
  userId: string
  nickname: string
  avatar?: string | null
  level: number
  at: string // すれ違った時刻
  canRequest: boolean // 10分以内か
  status: EncounterStatus
  instagram?: string | null // 相手が公開している場合のみ
}

export interface MyProfileInput {
  nickname: string
  avatar?: string | null
  level: number
  totalScore: number
  instagram?: string | null
  igPublic?: boolean
}

/** Instagram入力を正規化：URL/@/空白を除き、ユーザー名だけにする（不正なら空） */
export function sanitizeInstagram(raw: string): string {
  if (!raw) return ''
  let s = raw.trim()
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
  s = s.replace(/[/?#].*$/, '') // パス以降を除去
  s = s.replace(/^@/, '').trim()
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) return ''
  return s
}
/** Instagramプロフィールへのリンク */
export function instagramUrl(handle: string): string {
  return 'https://instagram.com/' + handle.replace(/^@/, '')
}

/** 位置は約100m精度に丸める（プライバシー保護：正確な現在地は送らない） */
function coarse(n: number): number {
  return Math.round(n * 1000) / 1000
}

async function ready(): Promise<string | null> {
  if (!isSupabaseEnabled || !supabase) return null
  return ensureAnonAuth()
}

/** フレンド機能が本番モード（匿名認証＋Supabase）で使えるか */
export async function friendsAvailable(): Promise<boolean> {
  return !!(await ready())
}

// ============================================================
//  Supabase（本番）実装
// ============================================================

/** 自分の表示用プロフィールを同期し、フレンドコードを得る（起動時に呼ぶ） */
export async function syncMyProfile(p: MyProfileInput): Promise<string | null> {
  const uid = await ready()
  if (!uid || !supabase) return localSyncMe(p)
  // Instagram対応版(6引数)。未適用DBでは失敗するので、その場合は従来版(4引数)へフォールバック。
  const r6 = await supabase.rpc('friend_sync_me', {
    p_nickname: p.nickname,
    p_avatar: p.avatar ?? null,
    p_level: p.level,
    p_total_score: p.totalScore,
    p_instagram: p.instagram ?? null,
    p_ig_public: !!p.igPublic,
  })
  if (!r6.error && r6.data) return r6.data.friend_code ?? null
  const r4 = await supabase.rpc('friend_sync_me', {
    p_nickname: p.nickname,
    p_avatar: p.avatar ?? null,
    p_level: p.level,
    p_total_score: p.totalScore,
  })
  if (r4.error || !r4.data) return null
  return r4.data.friend_code ?? null
}

export async function sendRequestByCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const uid = await ready()
  if (!uid || !supabase) return localSendByCode(code)
  const { data, error } = await supabase.rpc('friend_request_by_code', { p_code: code.trim().toUpperCase() })
  if (error) return { ok: false, error: mapErr(error.message) }
  return { ok: !!data?.ok, error: data?.error ? mapErr(data.error) : undefined }
}

export async function sendRequestToUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const uid = await ready()
  if (!uid || !supabase) return localSendToUser(userId)
  const { data, error } = await supabase.rpc('friend_request_to_user', { p_target: userId })
  if (error) return { ok: false, error: mapErr(error.message) }
  return { ok: !!data?.ok, error: data?.error ? mapErr(data.error) : undefined }
}

export async function listIncoming(): Promise<IncomingRequest[]> {
  const uid = await ready()
  if (!uid || !supabase) return localState().incoming
  const { data, error } = await supabase.rpc('friend_requests_incoming')
  if (error || !data) return []
  return (data as any[]).map((r) => ({ id: r.id, at: r.created_at, from: { userId: r.from_user, nickname: r.nickname ?? '名無し', avatar: r.avatar, level: r.level ?? 1, totalScore: r.total_score ?? 0 } }))
}

export async function respondRequest(id: string, accept: boolean): Promise<boolean> {
  const uid = await ready()
  if (!uid || !supabase) return localRespond(id, accept)
  const { data, error } = await supabase.rpc('friend_request_respond', { p_request: id, p_accept: accept })
  return !error && !!data?.ok
}

export async function listFriends(): Promise<FriendUser[]> {
  const uid = await ready()
  if (!uid || !supabase) return localState().friends
  const { data, error } = await supabase.rpc('friend_list')
  if (error || !data) return []
  return (data as any[]).map(mapUser)
}

export async function friendRanking(): Promise<(FriendUser & { isMe?: boolean })[]> {
  const uid = await ready()
  if (!uid || !supabase) return localRanking()
  const { data, error } = await supabase.rpc('friend_ranking')
  if (error || !data) return []
  return (data as any[]).map((r) => ({ ...mapUser(r), isMe: r.user_id === uid }))
}

/** 現在地を送信（すれ違い判定）。約100m精度。返り値：直近すれ違い件数 */
export async function pingLocation(lat: number, lng: number): Promise<number> {
  const uid = await ready()
  if (!uid || !supabase) return localPing()
  const { data, error } = await supabase.rpc('location_ping', { p_lat: coarse(lat), p_lng: coarse(lng) })
  if (error || !data) return 0
  return data.nearby ?? 0
}

/** 直近すれ違った人（申請可能＝10分以内も含む） */
export async function recentEncounters(minutes = 60): Promise<Encounter[]> {
  const uid = await ready()
  if (!uid || !supabase) return localState().encounters
  const { data, error } = await supabase.rpc('encounters_recent', { p_minutes: minutes })
  if (error || !data) return []
  return (data as any[]).map(mapEnc)
}

/** 足跡（すれ違い履歴・全期間・閲覧用） */
export async function footprints(): Promise<Encounter[]> {
  const uid = await ready()
  if (!uid || !supabase) return localState().footprints
  const { data, error } = await supabase.rpc('encounters_history')
  if (error || !data) return []
  return (data as any[]).map(mapEnc)
}

function mapUser(r: any): FriendUser {
  return { userId: r.user_id, code: r.friend_code, nickname: r.nickname ?? '名無し', avatar: r.avatar, level: r.level ?? 1, totalScore: r.total_score ?? 0, instagram: r.instagram ?? null }
}
function mapEnc(r: any): Encounter {
  return { userId: r.user_id, nickname: r.nickname ?? '名無し', avatar: r.avatar, level: r.level ?? 1, at: r.at ?? r.created_at, canRequest: !!r.can_request, status: (r.status ?? 'none') as EncounterStatus, instagram: r.instagram ?? null }
}
function mapErr(code: string): string {
  switch (code) {
    case 'not_found':
      return 'そのIDのユーザーが見つかりません'
    case 'self':
      return '自分には申請できません'
    case 'already_friends':
      return 'すでにフレンドです'
    case 'already_requested':
      return 'すでに申請済みです'
    case 'no_encounter':
      return 'すれ違いから10分を過ぎたため申請できません'
    default:
      return '申請に失敗しました'
  }
}

// ============================================================
//  ローカル・デモモード（Supabase未接続時）
// ============================================================
// UI確認用。実際のマルチユーザー通信はしないが、一通りの操作が体験できる。

const LKEY = 'kindai-growth-friends-local'
interface LocalState {
  myCode: string
  friends: FriendUser[]
  incoming: IncomingRequest[]
  encounters: Encounter[]
  footprints: Encounter[]
  requestedTo: string[]
}
const DEMO_POOL: FriendUser[] = [
  { userId: 'd1', nickname: 'Sakura', avatar: null, level: 26, totalScore: 9700, instagram: 'sakura_kindai' },
  { userId: 'd2', nickname: 'Haruto', avatar: null, level: 21, totalScore: 7300, instagram: null },
  { userId: 'd3', nickname: 'Mei', avatar: null, level: 19, totalScore: 6100, instagram: 'mei.photo' },
  { userId: 'd4', nickname: 'Ren', avatar: null, level: 24, totalScore: 8600, instagram: 'ren_gym' },
  { userId: 'd5', nickname: 'Aoi', avatar: null, level: 17, totalScore: 5200, instagram: null },
  { userId: 'd6', nickname: 'Yuki', avatar: null, level: 28, totalScore: 10200, instagram: 'yuki.trip' },
]
function genCode(): string {
  const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += s[Math.floor(Math.random() * s.length)]
  return c
}
function localState(): LocalState {
  try {
    const raw = localStorage.getItem(LKEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* noop */
  }
  const init: LocalState = {
    myCode: genCode(),
    friends: [DEMO_POOL[0], DEMO_POOL[3]],
    incoming: [{ id: 'r1', at: new Date().toISOString(), from: DEMO_POOL[2] }],
    encounters: [],
    footprints: [],
    requestedTo: [],
  }
  saveLocal(init)
  return init
}
function saveLocal(s: LocalState): void {
  try {
    localStorage.setItem(LKEY, JSON.stringify(s))
  } catch {
    /* noop */
  }
}
let myProfileCache: MyProfileInput | null = null
function localSyncMe(p: MyProfileInput): string {
  myProfileCache = p
  return localState().myCode
}
function localSendByCode(code: string): { ok: boolean; error?: string } {
  const s = localState()
  if (code.trim().toUpperCase() === s.myCode) return { ok: false, error: mapErr('self') }
  // デモ：任意コードで受理し、擬似的にフレンド申請「送信済み」にする
  return { ok: true }
}
function localSendToUser(userId: string): { ok: boolean; error?: string } {
  const s = localState()
  const enc = s.encounters.find((e) => e.userId === userId)
  if (!enc) return { ok: false, error: mapErr('not_found') }
  if (!enc.canRequest) return { ok: false, error: mapErr('no_encounter') }
  enc.status = 'requested'
  s.requestedTo.push(userId)
  saveLocal(s)
  return { ok: true }
}
function localRespond(id: string, accept: boolean): boolean {
  const s = localState()
  const req = s.incoming.find((r) => r.id === id)
  if (!req) return false
  s.incoming = s.incoming.filter((r) => r.id !== id)
  if (accept && !s.friends.some((f) => f.userId === req.from.userId)) s.friends.push(req.from)
  saveLocal(s)
  return true
}
function localRanking(): (FriendUser & { isMe?: boolean })[] {
  const s = localState()
  const me: FriendUser & { isMe: boolean } = {
    userId: 'me',
    nickname: myProfileCache?.nickname || 'あなた',
    avatar: myProfileCache?.avatar ?? null,
    level: myProfileCache?.level ?? 1,
    totalScore: myProfileCache?.totalScore ?? 0,
    instagram: myProfileCache?.instagram ?? null,
    isMe: true,
  }
  return [me, ...s.friends].sort((a, b) => b.totalScore - a.totalScore)
}
function localPing(): number {
  // デモ：呼ぶたびにプールから1人「すれ違った」ことにする（10分以内＝申請可能）
  const s = localState()
  const already = new Set([...s.encounters.map((e) => e.userId), ...s.friends.map((f) => f.userId)])
  const cand = DEMO_POOL.find((u) => !already.has(u.userId))
  if (cand) {
    const enc: Encounter = { userId: cand.userId, nickname: cand.nickname, avatar: cand.avatar, level: cand.level, at: new Date().toISOString(), canRequest: true, status: 'none', instagram: cand.instagram ?? null }
    s.encounters = [enc, ...s.encounters]
    s.footprints = [enc, ...s.footprints]
    saveLocal(s)
  }
  return s.encounters.filter((e) => e.canRequest).length
}
