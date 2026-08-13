-- ============================================================
-- KINDAI GROWTH 50人検証プロトタイプ - 最小スキーマ
-- Supabase SQL Editor に貼り付けて実行してください。
-- 認証: なし（匿名UUID方式・A案）。個人情報は保存しません。
-- 既存の本番志向20テーブルとは無関係の、検証専用4テーブルです。
-- ============================================================

-- 1) プロフィール -------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key,
  nickname   text not null,
  avatar     text,
  created_at timestamptz not null default now()
);
-- 既存DBへの追加用（初回作成時は上の定義に含まれる）
alter table public.profiles add column if not exists avatar text;

-- 2) ユーザーステータス（ランキングの基準 = total_score）----------
create table if not exists public.user_stats (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  level        int  not null default 1,
  exp          int  not null default 0,
  total_score  int  not null default 0,
  intelligence int  not null default 20,  -- 知力
  strength     int  not null default 20,  -- 体力/筋力
  vitality     int  not null default 20,  -- 活力
  charm        int  not null default 20,  -- 魅力
  updated_at   timestamptz not null default now()
);
create index if not exists idx_user_stats_score on public.user_stats (total_score desc);

-- 3) 達成ログ ----------------------------------------------------
create table if not exists public.mission_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  mission_type  text not null,          -- 'daily' | 'self'
  mission_title text not null,
  category      text,
  score         int  not null default 0,
  exp           int  not null default 0,
  completed_at  timestamptz not null default now(),
  app_date      date not null
);
create index if not exists idx_mission_logs_user on public.mission_logs (user_id, app_date);

-- 4) デイリーミッション・マスタ（参考・クライアントはローカルで日替り抽選）
create table if not exists public.daily_missions (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  category  text not null,
  score     int  not null default 50,
  exp       int  not null default 30,
  is_active boolean not null default true
);

-- ============================================================
-- RLS（検証版の最小構成）
-- 認証が無いため anon ロールに許可を与える。個人情報は扱わないため、
-- 「全員read可 / insert・update可（deleteは禁止）」という検証用ポリシー。
-- ※本番では auth 一本化＋厳密RLS＋サーバー計算に置き換えること。
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.user_stats    enable row level security;
alter table public.mission_logs  enable row level security;
alter table public.daily_missions enable row level security;

-- profiles
drop policy if exists p_profiles_read   on public.profiles;
drop policy if exists p_profiles_write  on public.profiles;
create policy p_profiles_read  on public.profiles for select using (true);
create policy p_profiles_write on public.profiles for insert with check (true);
drop policy if exists p_profiles_update on public.profiles;
create policy p_profiles_update on public.profiles for update using (true) with check (true);

-- user_stats
drop policy if exists p_stats_read   on public.user_stats;
drop policy if exists p_stats_insert on public.user_stats;
drop policy if exists p_stats_update on public.user_stats;
create policy p_stats_read   on public.user_stats for select using (true);
create policy p_stats_insert on public.user_stats for insert with check (true);
create policy p_stats_update on public.user_stats for update using (true) with check (true);

-- mission_logs
drop policy if exists p_logs_read   on public.mission_logs;
drop policy if exists p_logs_insert on public.mission_logs;
create policy p_logs_read   on public.mission_logs for select using (true);
create policy p_logs_insert on public.mission_logs for insert with check (true);

-- daily_missions
drop policy if exists p_daily_read on public.daily_missions;
create policy p_daily_read on public.daily_missions for select using (true);

-- ============================================================
-- デイリーミッション・マスタの初期データ（クライアントの POOL と同一）
-- ============================================================
insert into public.daily_missions (title, category) values
  ('勉強を10分する', '勉強'),
  ('英単語を15個おぼえる', '勉強'),
  ('授業の復習を15分', '勉強'),
  ('読書を10分する', '勉強'),
  ('ストレッチを5分する', '運動'),
  ('腕立て・腹筋を10回', '運動'),
  ('20分ウォーキング', '運動'),
  ('階段を使って移動する', '運動'),
  ('朝、決めた時間に起きる', '生活習慣'),
  ('水を1.5L以上飲む', '生活習慣'),
  ('机まわりを片付ける', '生活習慣'),
  ('今日の予定を立てる', '生活習慣'),
  ('今日の振り返りを書く', '振り返り'),
  ('感謝したことを1つ書く', '振り返り'),
  ('明日の目標を決める', '振り返り')
on conflict do nothing;

-- ============================================================
-- 6,000人フェーズ拡張（2026-08 適用済み・既存を壊さない追加）
-- ============================================================
-- 1) 行動ログの詳細化（後から取得不能な活動時間・種目を保存）
alter table public.mission_logs
  add column if not exists mission_key text,
  add column if not exists started_at timestamptz,
  add column if not exists duration_seconds integer,
  add column if not exists coin_delta integer,
  add column if not exists stat_key text,
  add column if not exists stat_delta integer;
create index if not exists idx_mission_logs_key on public.mission_logs (mission_key, app_date);

-- 2) 大学・学部マスタ＋プロフィール属性（"近畿大学"ベタ書き回避／学年別分析の前提）
create table if not exists public.universities (
  id smallint primary key, name text not null, code text unique, created_at timestamptz not null default now());
create table if not exists public.faculties (
  id smallint primary key, university_id smallint not null references public.universities(id), name text not null);
insert into public.universities (id, name, code) values (1,'近畿大学','kindai') on conflict (id) do nothing;
-- faculties は 1..15＋99(その他) を投入（省略・migration参照）
alter table public.profiles
  add column if not exists university_id smallint references public.universities(id) default 1,
  add column if not exists faculty_id smallint references public.faculties(id),
  add column if not exists enrollment_year smallint,
  add column if not exists gender text;

-- 3) ランキング：全件取得しない集計RPC＋索引（6,000人でも低コスト・正確）
create index if not exists idx_user_stats_score on public.user_stats (total_score desc);
-- function public.get_ranking(me uuid, win int, topn int) returns jsonb  ... （migration参照）
