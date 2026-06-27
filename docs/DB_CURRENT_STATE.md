# KINDAI GROWTH — Supabase DB 現状調査（DB_CURRENT_STATE）

> 作成日: 2026-06-27
> 調査方法: Supabase Studio の SQL Editor で読み取り専用クエリ（`information_schema` / `pg_catalog`）を実行し、結果JSONを解析。
> **DBの中身・スキーマは一切変更していない（SELECTのみ）。** 秘密情報（service_role key 等）は本ファイルに含めていない。
> 重要な発見: このDBは現行 Vite プロトタイプ（localStorageのみ）とは**接続されておらず**、別途「本番志向」で設計された未接続のスキーマである。

---

## 1. プロジェクト構成（項目1）

| 項目 | 内容 |
|---|---|
| publicスキーマのテーブル数 | **20** |
| 有効な拡張機能 | `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp` |
| Auth登録ユーザー数 | **1**（`auth.users`。テストユーザー1件のみ） |
| Storageバケット | **なし**（`storage.buckets` が空） |
| RLSポリシー | **0件**（全テーブルでRLS有効だがポリシー未定義） |
| 外部キー | **0件**（FK制約が1つも定義されていない） |
| Edge Functions | **未確認**（SQLでは取得不可。Dashboard要確認） |
| アプリ接続コード | **なし**（Vite/React側にSupabaseクライアント未実装＝項目11の確定事項） |

---

## 2. テーブル一覧（項目2）

機能グループ別の20テーブル：

| グループ | テーブル |
|---|---|
| ユーザー/認証 | `users`, `user_profiles`, `user_settings`, `user_stats`, `university_verifications` |
| 大学 | `universities` |
| ミッション | `mission_categories`, `missions`, `daily_missions`, `user_missions`, `mission_logs` |
| スコア/シーズン | `seasons`, `season_user_scores`, `score_logs`, `ranking_snapshots` |
| 称号 | `titles`, `user_titles` |
| ソーシャル | `friendships`, `notifications`, `push_tokens` |

> 注: **店舗・クーポン関連テーブルは存在しない**（事業計画のB2B2C中核機能が未設計）。

---

## 3. 各テーブルのカラム構成（項目3）— 主要点のみ

- `users`: id(bigint), email(text), created_at, updated_at, last_login_at
- `user_profiles`: id, user_id(text), display_name, username, university_id(**uuid, default `gen_random_uuid()`**), avatar_url, bio, current_title_id, level(int), total_exp(bigint), total_score(bigint), coin_balance(**double precision**), streak_count(bigint), …
- `user_stats`: user_id(text), intelligence, strength, vitality, charm（=知力/体力/活力/魅力に対応）
- `user_settings`: daily_notification_enabled, reminder_notification_enabled, profile_public, show_on_ranking …
- `missions`: category_id(text), title, description, mission_type(**bytea**), difficulty(**bytea**), base_exp/base_sp/base_coin/base_score/base_intelligence/base_strength/base_vitality/base_charm(bigint), coefficient(int), min_duration_minutes(**time**), max_duration_minutes(**time**), is_active …
- `mission_categories`: name, description, target_status(text=対応ステータス), icon_url, color_code, updated_at(**text**)
- `daily_missions`: mission_id(text), assigned_date(**time**), target_user_id(text), is_global(bool) …
- `user_missions`: user_id(text), mission_id(text), status, assigned_date, started_at, completed_at, expires_at（日付系すべて **date**）
- `mission_logs`: user_id(text), mission_id(text), user_mission_id(text), started_at(**date**), ended_at(**date**), duration_minutes(**time**), review_text, evidence_image_url, text_content, status, is_suspicious(bool) …
- `score_logs`: user_id, mission_log_id, season_id, exp_amount, score_amount, season_point_amount, coin_amount, intelligence_delta/strength_delta/vitality_delta/charm_delta(bigint), reason …
- `seasons`: name, start_date, end_date, is_active …
- `season_user_scores`: user_id, season_id, season_point, today_point, current_rank, league(text) …
- `ranking_snapshots`: ranking_type(**bytea**), season_id, university_id, user_id, rank, score, calculated_at …
- `titles`: name, description, unlock_condition_type, unlock_condition_value(bigint), rarity, is_active …
- `user_titles`: user_id, title_id, acquired_at(date), is_equipped(bool)
- `universities`: name, domain, prefecture, is_active …
- `university_verifications`: user_id, university_id, university_email, verification_code(**text/平文**), verified_at, status …
- `friendships`: requester_id(text), receiver_id(text), status, requested_at(date), accepted_at(date) …
- `notifications`: user_id, notification_type, title, body, is_read(bool), sent_at(date) …
- `push_tokens`: user_id, device_token(text), platform, is_active …

（全カラムの完全な型一覧は `db_snapshot` JSON を参照）

---

## 4. 主キー・外部キー・ユニーク制約（項目4）

- **主キー**: 全20テーブルに `<table>_pkey`（`id` bigint）が存在。✅
- **外部キー**: **0件**。`*_id` 系の参照カラムは多数あるが、FK制約は一切張られていない。❌
- **ユニーク制約**: **0件**。`users.email` / `user_profiles.username` / `universities.domain` / `friendships(requester,receiver)` / `season_user_scores(user,season)` / `user_titles(user,title)` 等に一意制約なし。❌
- その他の `2200_xxxxx_N_not_null` という CHECK 制約は、PostgreSQLが自動生成する **NOT NULL 制約**であり、業務的なCHECKではない。

> **型の不整合（重大）**: PKの `id` はすべて `bigint` だが、参照側の `user_id` / `mission_id` / `category_id` などはすべて `text`。さらに `user_profiles.university_id` だけ `uuid`。→ そもそも型が合わずFKを張れない設計になっている。

---

## 5. RLSの有効/無効（項目5）

- **全20テーブルでRLS有効**（`rls_enabled = true`）。`rls_forced` は全て false。

## 6. RLSポリシーの有無（項目6）

- **ポリシーは0件**（`pg_policies` が null）。
- → 現状は「RLS有効＋ポリシー無し」＝ **anon / authenticated ロールからは全行が拒否（deny-all）** される状態。クライアントからは読み書きできない。
- → 逆に、もしアプリが `service_role` key で接続するとRLSを完全バイパスし**極めて危険**。本番ではユーザー単位の所有者ポリシー定義が必須。

---

## 7. Authentication設定の状態（項目7）

- `auth.users` に **1ユーザー**（テスト想定）。
- **独自の `public.users` テーブルが別途存在**し、Supabase標準の `auth.users` と二重管理になっている。`public.users.id` は bigint、`auth.users.id` は uuid のため、両者は型的に紐づいていない。
- 各テーブルの `user_id` は `text` で、`auth.uid()`（uuid）と直接比較できない。
- プロバイダ設定（Email/Google、メール確認要否、ドメイン制限など）は **SQLでは取得不可 → Dashboard要確認**。

---

## 8. Storageバケットの有無（項目8）

- **バケットなし**（`storage.buckets` 空）。
- 一方でスキーマには `avatar_url` / `evidence_image_url`（ミッション証跡画像）/ `icon_url` が存在 → 画像保存先のバケットが**未整備**。

---

## 9. Edge Functionsの有無（項目9）

- **未確認**。Edge FunctionsはDBに記録されないためSQLでは取得できない。Dashboard → Edge Functions で要確認。
- 設計上は「スコア計算」「ランキング集計（`ranking_snapshots`）」「不正検知（`mission_logs.is_suspicious`）」「プッシュ通知送信」などサーバ処理が想定され、Functions/cronが必要になる見込み。

---

## 10. seedデータ・初期データの有無（項目10）

- 行数は全テーブルで `approx_rows = -1`（=未ANALYZE。正確な件数は不明）。`auth_user_count = 1`。
- マスタ系（`universities`, `mission_categories`, `missions`, `titles`, `seasons`）に初期データが入っているかは本調査では確定できない。
- 正確な件数が必要なら `select relname, n_live_tup from pg_stat_user_tables;` または各テーブルの `count(*)` を別途実行。

---

## 11. Vite/Reactアプリからの接続設定（項目11）

- **接続設定なし**。アプリ側に Supabaseクライアント・`.env`・接続URL/キーは存在しない（既調査で確定）。
- 現アプリは localStorage 永続化のみ。**このDBとアプリは完全に未接続**。

---

## 12. 最新仕様（大学RPG）にどこまで使えるか（項目12）

**結論: スキーマ設計の「網羅性」は高く、事業計画の主要機能を概ねカバーしている。** プロトタイプより遥かに本番仕様に近い。

仕様との対応：

| 事業計画の要素 | DB対応 | 評価 |
|---|---|---|
| 大学メール認証 | `university_verifications`, `universities.domain` | ◯ テーブルあり |
| 4ステータス（体力/知力/活力/魅力） | `user_stats`(strength/intelligence/vitality/charm), `missions.base_*` | ◎ 対応明確 |
| レベル/EXP/スコア/コイン | `user_profiles`(level/total_exp/total_score/coin_balance), `score_logs` | ◎ プロトより詳細 |
| シーズン制・リーグ | `seasons`, `season_user_scores`(league) | ◎ プロトに無い要素 |
| 学内/全体ランキング | `ranking_snapshots`, `season_user_scores.current_rank` | ◯ |
| 称号 | `titles`, `user_titles` | ◎ 将来機能を先取り済み |
| フレンド | `friendships` | ◯ |
| 通知・プッシュ | `notifications`, `push_tokens` | ◎ |
| ミッション記録ループ | `missions`/`user_missions`/`mission_logs`/`score_logs` | ◯ 構造あり |

**ただし「設計はあるが本番では使えない」レベルの欠陥が多い**（型の誤り・FK皆無・RLSポリシー皆無・auth二重管理）。詳細は §13 と `DB_GAP_ANALYSIS.md`。

**仕様を満たせない欠落：**
- **店舗・クーポン・店頭提示カウント**（B2B2Cの収益中核）に対応するテーブルが**皆無**。
- **学部（faculty）** の概念がない（`universities` に学部なし、`user_profiles` に学部カラムなし）→ 事業計画の「学部別ランキング」が現状不可能。
- **目標選択**（登録時のTOEIC/筋トレ等）、**招待コード**（双方SP付与）、**イベント**（夏の累計ランキング等）に対応するテーブルなし。

---

## 13. 作り直す/流用/追加すべきテーブル（項目13・要約）

**流用可（型・制約を補修して使える）**: `user_profiles`, `user_stats`, `user_settings`, `missions`, `mission_categories`, `daily_missions`, `user_missions`, `mission_logs`, `score_logs`, `seasons`, `season_user_scores`, `ranking_snapshots`, `titles`, `user_titles`, `universities`, `university_verifications`, `friendships`, `notifications`, `push_tokens`

**作り直し/方針再設計が必要**:
- `users`（独自テーブル）… `auth.users` と二重。原則 `auth.users` + `user_profiles.user_id → auth.users.id(uuid)` に寄せ、独自usersは廃止 or 役割限定。
- **ID戦略全体** … PK=bigint と 参照=text/uuid の不整合を解消（uuid統一を推奨）。型を揃えた上で全FKを張り直す。
- `bytea` カラム（`missions.mission_type`/`difficulty`, `ranking_snapshots.ranking_type`）… text/enum へ。
- `time`・`date` で持っている所要時間/日時（`*_minutes`, `started_at`/`ended_at`/各 `*_at`）… int分 / timestamptz へ。
- `user_profiles.university_id`(uuid, default `gen_random_uuid()`) … 既定値が誤り。FK化して既定値削除。
- `user_profiles.coin_balance`(double precision) … 整数 or numeric へ（通貨を浮動小数で持たない）。

**新規追加が必要**:
- 店舗（`stores`/`partner_stores`）、クーポン（`coupons`）、引換・店頭提示計測（`coupon_redemptions`）
- 学部（`faculties` ＋ `user_profiles.faculty_id`）
- 目標（`goals` / `user_goals`）、招待コード（`invitations`）、イベント（`events`）
- Storageバケット（`avatars`, `mission-evidence`）

**セキュリティ最優先**:
- 全テーブルにRLSポリシーを定義（所有者のみ read/write、公開ランキングは限定的に）。
- `user_id` を `auth.uid()` と型一致させ、`auth.uid() = user_id` でのRLSを成立させる。
- `university_verifications.verification_code` の平文保存をやめる（ハッシュ＋短期失効）。
- `users.email` / `username` / `universities.domain` 等にUNIQUE付与。

---

## 補足: 本調査で未確定の項目

| 項目 | 未確定の理由 | 確認方法 |
|---|---|---|
| Edge Functions | DBに記録されない | Dashboard → Edge Functions |
| Auth プロバイダ/メール確認/ドメイン制限 | SQLで取得不可 | Dashboard → Authentication |
| 各テーブルの正確な行数 | `approx_rows=-1`（未ANALYZE） | `count(*)` / `pg_stat_user_tables` |
| マスタ初期データの中身 | 件数不明 | 各マスタを `select` |
| `id` が IDENTITY/serial か | default=null表示のみ | `pg_attribute` / テーブルDDL |
