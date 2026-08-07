// ===== Supabase クライアント =====
// 検証用。VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を .env に設定すると有効化される。
// 未設定の場合は null になり、アプリは自動的に「ローカルのみモード」で動作する
// （UIは動くが、共通ランキングは無効。50人検証には .env 設定が必須）。

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseEnabled = !!supabase
