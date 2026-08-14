// ===== Supabase クライアント =====
// 検証用。VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を .env に設定すると有効化される。
// 未設定の場合は null になり、アプリは自動的に「ローカルのみモード」で動作する
// （UIは動くが、共通ランキングは無効。50人検証には .env 設定が必須）。

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null

export const isSupabaseEnabled = !!supabase

// ===== 匿名認証（報酬機能の不正対策の土台） =====
// 端末ごとに Supabase の匿名ユーザー(auth.uid())を発行し、RLS/RPCの本人判定に使う。
// ※ Supabaseダッシュボードで「Anonymous sign-ins」を有効化しておく必要がある。
let authReady: Promise<string | null> | null = null

/** 匿名セッションを保証し、auth user id を返す（無効/失敗時は null） */
export function ensureAnonAuth(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null)
  if (!authReady) {
    authReady = (async () => {
      const { data } = await supabase!.auth.getSession()
      if (data.session?.user) return data.session.user.id
      const { data: signed, error } = await supabase!.auth.signInAnonymously()
      if (error) {
        // 匿名認証が未有効などで失敗した場合は null（呼び出し側でフォールバック表示）
        authReady = null // 次回リトライできるように解除
        return null
      }
      return signed.user?.id ?? null
    })()
  }
  return authReady
}
