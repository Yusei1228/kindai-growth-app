# KINDAI GROWTH — MVP データベース設計書 v2（DB_SCHEMA_V2）

> 作成日: 2026-06-27
> 前提資料: `DB_REDESIGN_PLAN.md` / `DB_CURRENT_STATE.md` / `DB_GAP_ANALYSIS.md` / `IMPLEMENTATION_GAP.md`
> 位置づけ: MVPのためのテーブル設計書（**ドラフト**）。論理＋物理の設計方針をテーブル単位で確定するための資料。
> **本書はSQL（CREATE/ALTER/RLSポリシー）・マイグレーション・実装を一切含まない。** 実装はエンジニアレビュー後の別タスク。
> 本タスクで DB変更・src変更・認証設定変更・マイグレーション作成・機能実装は**一切行っていない**。

---

## 0. 全体設計原則（全テーブル共通）

これらは各テーブル定義で繰り返さない共通の前提とする。

| 項目 | 方針 |
|---|---|
| **ID戦略** | 全テーブルのPKは `uuid`（既定 `gen_random_uuid()`）。全参照キーも `uuid` で型一致させFK成立させる（`DB_REDESIGN_PLAN §5`）。 |
| **ユーザー識別** | `user_id uuid = auth.users.id` に一本化。独自`users`テーブルは廃止（`§6`）。 |
| **日時** | 監査列 `created_at` / `updated_at` は `timestamptz`（既定 `now()`）。日付系も原則 timestamptz（暦日のみ意味を持つ列は `date`）。 |
| **種別** | enum もしくは CHECK 付き `text`（旧 `bytea` を排除）。 |
| **通貨/ポイント** | 整数（最小単位）。浮動小数（double）禁止。 |
| **RLS** | 全テーブル RLS 有効＋明示ポリシー。「ポリシー無しのRLS有効」は禁止（`§7`）。 |
| **書き込み権限** | スコア/EXP/ステータス/コイン/順位/称号解放はクライアント直接更新禁止。サーバ（RPC/Edge Function）経由のみ（`§14`・本書§S）。 |
| **`service_role`** | サーバ側のみ。クライアント（Vite/React）に絶対に置かない。 |

分類凡例: **MVP必須** / **P1必須（MVP後半）** / **Phase1.5** / **Phase2以降**

---

## 1. 認証・プロフィール

### `profiles` — 分類: MVP必須
| 項目 | 内容 |
|---|---|
| 役割 | アプリ用ユーザープロフィール（auth.usersの拡張）。レベル/EXP/スコア/コイン/ストリーク等の集約 |
| 主なカラム | id, user_id, display_name, username, university_id, faculty_id, avatar_url, bio, current_title_id, level, total_exp, total_score, coin_balance, streak_count, last_active_date, created_at, updated_at |
| カラム型方針 | level=int / total_exp,total_score,coin_balance,streak_count=**bigint(整数)** / 文字列=text / 日時=timestamptz |
| PK | id (uuid) |
| FK | user_id→auth.users.id, university_id→universities.id, faculty_id→faculties.id, current_title_id→titles.id |
| UNIQUE | user_id（1ユーザー1プロフィール）, username |
| インデックス | university_id, faculty_id（学部/大学ランキングの絞り込み用）, username |
| RLS | 本人は全操作可。他者は公開許可範囲のみ select（`user_settings.profile_public`を尊重）。score/level等の更新はサーバ経由のみ |

> 補足: coin_balance/level/total_exp 等の**集計値はサーバ計算で更新**。クライアントは読み取りのみ。

### `user_stats` — 分類: MVP必須
| 項目 | 内容 |
|---|---|
| 役割 | 4ステータス（知力/筋力/活力/魅力）の現在値。※カラム名は `intelligence`/`strength`/`vitality`/`charm`（`strength`＝筋力でそのまま） |
| 主なカラム | id, user_id, intelligence, strength, vitality, charm, created_at, updated_at |
| カラム型方針 | ステータス=int（上限値の扱いはサーバ計算側で制御） |
| PK | id (uuid) |
| FK | user_id→auth.users.id |
| UNIQUE | user_id（1対1） |
| インデックス | user_id（UNIQUE兼） |
| RLS | 本人select可。**更新はサーバ経由のみ**（直接update禁止） |

### `user_settings` — 分類: MVP必須
| 項目 | 内容 |
|---|---|
| 役割 | 通知ON/OFF・公開設定 |
| 主なカラム | id, user_id, daily_notification_enabled, reminder_notification_enabled, profile_public, show_on_ranking, created_at, updated_at |
| カラム型方針 | boolean各種 |
| PK | id (uuid) |
| FK | user_id→auth.users.id |
| UNIQUE | user_id（1対1） |
| インデックス | user_id（UNIQUE兼） |
| RLS | 本人のみ全操作可 |

> `auth.users`（Supabase標準）が認証の真実。email/パスワード/プロバイダはauth側で管理し、本設計のpublicテーブルでは複製しない。

---

## 2. 大学・学部

### `universities` — 分類: MVP必須（公開マスタ）
| 項目 | 内容 |
|---|---|
| 役割 | 大学マスタ（ドメイン判定の基準） |
| 主なカラム | id, name, domain, prefecture, is_active, created_at, updated_at |
| カラム型方針 | text / boolean / timestamptz |
| PK | id (uuid) |
| FK | — |
| UNIQUE | domain（大学メール判定キー） |
| インデックス | domain |
| RLS | 全認証ユーザー select 可。書き込みは管理者/サーバのみ |

### `faculties` — 分類: MVP必須（公開マスタ・新規）
| 項目 | 内容 |
|---|---|
| 役割 | 学部マスタ（学部別ランキングの次元） |
| 主なカラム | id, university_id, name, sort_order, is_active, created_at, updated_at |
| カラム型方針 | text / sort_order=int |
| PK | id (uuid) |
| FK | university_id→universities.id |
| UNIQUE | (university_id, name) |
| インデックス | university_id |
| RLS | 全認証ユーザー select 可。書き込みは管理者/サーバのみ |

### `university_verifications` — 分類: MVP必須
| 項目 | 内容 |
|---|---|
| 役割 | 大学メール認証（在籍確認） |
| 主なカラム | id, user_id, university_id, university_email, code_hash, expires_at, verified_at, status, created_at, updated_at |
| カラム型方針 | **認証コードは平文保持しない→`code_hash`＋`expires_at`で短期失効**。status=enum/text。各日時=timestamptz |
| PK | id (uuid) |
| FK | user_id→auth.users.id, university_id→universities.id |
| UNIQUE | (user_id, university_id)（要レビュー＝再申請の扱い） |
| インデックス | user_id, university_email |
| RLS | 本人のみ。**コード検証はサーバ経由**（照合をクライアントに晒さない） |

---

## 3. ミッション

### `mission_categories` — 分類: MVP必須（公開マスタ）
| 項目 | 内容 |
|---|---|
| 役割 | カテゴリ→対応ステータスのマッピング（勉強→知力 等） |
| 主なカラム | id, name, description, target_status, icon_url, color_code, sort_order, created_at, updated_at |
| カラム型方針 | target_status=enum/text（intelligence/strength/vitality/charm）。**updated_atはtimestamptz**（旧text誤りを修正） |
| PK | id (uuid) |
| FK | — |
| UNIQUE | name |
| インデックス | — |
| RLS | 全認証ユーザー select 可。書き込みは管理者/サーバのみ |

### `missions` — 分類: MVP必須（公開マスタ）
| 項目 | 内容 |
|---|---|
| 役割 | ミッション定義と報酬係数 |
| 主なカラム | id, category_id, title, description, mission_type, difficulty, base_exp, base_sp, base_coin, base_score, base_intelligence, base_strength, base_vitality, base_charm, coefficient, min_duration_minutes, max_duration_minutes, is_active, created_at, updated_at |
| カラム型方針 | **mission_type/difficulty=enum/text（旧bytea修正）**, base_*=int, coefficient=numeric, **min/max_duration_minutes=int（分。旧time修正）** |
| PK | id (uuid) |
| FK | category_id→mission_categories.id |
| UNIQUE | （任意）title |
| インデックス | category_id, is_active |
| RLS | 全認証ユーザー select 可。書き込みは管理者/サーバのみ |

### `user_missions` — 分類: MVP必須
| 項目 | 内容 |
|---|---|
| 役割 | ユーザー別ミッション割当・進捗。**デイリーミッション3件とセルフミッションを同一テーブルで扱う**（専用 `daily_missions` テーブルはMVPでは増やさない） |
| 主なカラム | id, user_id, mission_id, **mission_source**, **app_date**, **slot_no**, status, **completed_counted**, started_at, completed_at, expires_at, created_at, updated_at |
| カラム型方針 | status=enum/text, **mission_source=enum/text（`daily` / `self`）**, **app_date=date（朝5時切替後の「アプリ日付」。深夜帯を前日扱いにするための論理日付）**, **slot_no=int（dailyは1〜3、selfはnull）**, **completed_counted=boolean（報酬付与済みか＝二重カウント防止フラグ）**, started_at/completed_at/expires_at=timestamptz |
| PK | id (uuid) |
| FK | user_id→auth.users.id, mission_id→missions.id |
| UNIQUE | **daily用: (user_id, app_date, slot_no)（デイリー3枠の重複配布防止）**。selfミッションは slot_no=null のため本UNIQUEの対象外（部分UNIQUE想定／§X要レビュー） |
| インデックス | (user_id, app_date), (user_id, status), (user_id, mission_source, app_date) |
| RLS | 本人のみ。statusの確定/報酬反映・completed_counted更新はサーバ経由 |

> **デイリーミッション要件の表現方法**:
> - `mission_source='daily'` ＋ `slot_no ∈ {1,2,3}` ＋ `app_date` で「その日のデイリー3件」を一意に表す。
> - `app_date` は**朝5時切替**後の論理日付（例: 0:00〜4:59は前日の `app_date`）。日付境界の判定はサーバ側で行う。
> - `mission_source='self'` はユーザーが任意に追加するセルフミッション（slot_no=null、回数制限なし）。
> - 報酬の二重付与は `completed_counted` フラグ＋ `score_logs` の冪等キー（§4・⑤）で二重に防止する。

### `mission_logs` — 分類: MVP必須
| 項目 | 内容 |
|---|---|
| 役割 | ミッション実行ログ（所要時間/レビュー/証跡/不正フラグ） |
| 主なカラム | id, user_id, mission_id, user_mission_id, started_at, ended_at, duration_minutes, review_text, evidence_image_url, text_content, status, is_suspicious, created_at, updated_at |
| カラム型方針 | **started_at/ended_at=timestamptz, duration_minutes=int（旧time修正）**, is_suspicious=boolean |
| PK | id (uuid) |
| FK | user_id→auth.users.id, mission_id→missions.id, user_mission_id→user_missions.id |
| UNIQUE | **設けない**。`(user_mission_id)` をUNIQUEにするとセルフミッションの複数回記録・再記録ができなくなるため。**報酬の二重付与防止は `mission_logs` 側ではなく `score_logs.mission_log_id` のUNIQUE／冪等キーで担保する**（§4・⑤方針） |
| インデックス | (user_id, created_at desc), mission_id, user_mission_id |
| RLS | 本人select/insert可。ただし**報酬確定・is_suspicious判定はサーバ**。証跡画像URLはStorage側RLSと連動 |

> `mission_logs` は「実行の記録」を素直に複数許容する（同一ミッションの再挑戦・複数回記録に対応）。スコアの二重加算は `score_logs`（§4）で防ぐ。

---

## 4. スコア・EXP・ステータス

### `score_logs` — 分類: MVP必須（改ざん厳禁）
| 項目 | 内容 |
|---|---|
| 役割 | スコア/EXP/SP/コイン/ステータス増減の履歴（監査・再計算の元） |
| 主なカラム | id, user_id, mission_log_id, season_id, exp_amount, score_amount, season_point_amount, coin_amount, intelligence_delta, strength_delta, vitality_delta, charm_delta, reason, created_at |
| カラム型方針 | 各amount/delta=bigint(整数), reason=enum/text |
| PK | id (uuid) |
| FK | user_id→auth.users.id, mission_log_id→mission_logs.id, season_id→seasons.id |
| UNIQUE | **`mission_log_id`（または冪等キー `idempotency_key`）をUNIQUEにし、報酬の二重加算を防止する**。`mission_logs` 側ではUNIQUEを設けず（§3）、報酬付与の一意性はこの `score_logs` 層で担保する |
| インデックス | (user_id, created_at desc), season_id |
| RLS | 本人select可。**insert/updateはサーバ専用（クライアント直接書き込み禁止）** |

> **報酬二重付与の防止は二段構え**: ①`user_missions.completed_counted`（付与済みフラグ）②`score_logs.mission_log_id`（または冪等キー）のUNIQUE。サーバ計算（§S）はこの冪等性を前提に「同じ実行に対して二重加点しない」。`mission_log_id` を加点単位とするか別の冪等キーを使うかは §X 要レビュー。

### `seasons` — 分類: MVP必須（公開マスタ）
| 項目 | 内容 |
|---|---|
| 役割 | シーズン定義（期間/有効） |
| 主なカラム | id, name, start_date, end_date, is_active, created_at, updated_at |
| カラム型方針 | date / boolean |
| PK | id (uuid) |
| FK | — |
| UNIQUE | （任意）is_active=trueは1件に制御（部分UNIQUE／運用ルール） |
| インデックス | is_active |
| RLS | 全認証ユーザー select 可。書き込みは管理者/サーバのみ |

### `season_user_scores` — 分類: MVP必須（ランキングの主役・改ざん厳禁）
| 項目 | 内容 |
|---|---|
| 役割 | シーズン×ユーザーの累計スコア/当日Pt/リーグ（**即時更新でランキングの主テーブル**）。**順位は保存せずオンデマンド算出を原則とする** |
| 主なカラム | id, user_id, season_id, season_point, today_point, **last_scored_at**, league, university_id, faculty_id, current_rank(任意・キャッシュ), rank_updated_at(任意), updated_at, created_at |
| カラム型方針 | season_point/today_point=bigint, **last_scored_at=timestamptz（同点タイブレーク用＝そのスコアに到達した最終加点時刻）**, league=enum/text。university_id/faculty_idは絞り込み高速化のため非正規化保持（要レビュー） |
| PK | id (uuid) |
| FK | user_id→auth.users.id, season_id→seasons.id, university_id→universities.id, faculty_id→faculties.id |
| UNIQUE | (user_id, season_id) |
| インデックス | **(season_id, season_point desc, last_scored_at asc, user_id asc)**（同点ルール準拠の並び）, (season_id, university_id, season_point desc, last_scored_at asc), (season_id, faculty_id, season_point desc, last_scored_at asc) ＝上位N/近傍/学部別の高速化 |
| RLS | 公開部分は select 可（`show_on_ranking`尊重）。**書き込みはサーバ専用** |

> **順位（current_rank）の扱い — 重要**:
> - **`season_point` は即時更新するが、`current_rank` は常時の真実として保存しない。** 順位をSP更新のたびに全ユーザー再計算すると、自分の加点で他人の順位も動き、書き込みが重くなるため。
> - **現在順位は API/RPC でオンデマンド算出**する（同点ルール準拠の `count(*)+1` 等、§R）。
> - `current_rank` / `rank_updated_at` 列を残す場合は、**「正確な真実ではなくキャッシュ（最後にバッチ/閲覧時に算出した近似値）」と明示**する。表示は基本オンデマンド値を優先し、キャッシュは補助に留める。

> **同点（タイブレーク）ルール — ランキング全体で統一**:
> 1. `season_point DESC`
> 2. `last_scored_at ASC`（同点なら先に到達した人が上位＝`reached_at` と同義。本設計では `last_scored_at` を採用）
> 3. `user_id ASC`（最終決定打）
> この順序を、上位N・近傍ウィンドウ・フレンド・snapshot 確定の**すべてで共通**に用いる。

---

## 5. ランキング

### `ranking_snapshots` — 分類: P1必須（MVPでは補助／確定用）
| 項目 | 内容 |
|---|---|
| 役割 | 週間/月間の**確定**ランキング、及び大規模化後の集計キャッシュ。**MVPの即時表示には使わない**（§9） |
| 主なカラム | id, ranking_type, period_key, season_id, university_id, faculty_id, user_id, rank, score, calculated_at, created_at |
| カラム型方針 | **ranking_type=enum/text（旧bytea修正）**（weekly/monthly × overall/university/faculty）, rank/score=bigint, period_key=text |
| PK | id (uuid) |
| FK | season_id→seasons.id, university_id→universities.id, faculty_id→faculties.id, user_id→auth.users.id |
| UNIQUE | (ranking_type, period_key, scope_key, user_id)（同一区分の重複防止／scope_key設計は要レビュー） |
| インデックス | (ranking_type, period_key, rank) |
| RLS | 公開select可（`show_on_ranking`尊重）。**書き込みはサーバ（cron/Edge Function）専用** |

> **ランキング設計の確定事項（§9 詳細）は本書「§R ランキング取得設計」を参照。**

---

## 6. 称号

### `titles` — 分類: MVP必須（公開マスタ）
| 項目 | 内容 |
|---|---|
| 役割 | 称号マスタ（名称/説明/解放条件/レア度）。**MVPは通常称号のみ** |
| 主なカラム | id, name, description, unlock_condition_type, unlock_condition_value, rarity, is_active, created_at, updated_at |
| カラム型方針 | unlock_condition_type=enum/text, unlock_condition_value=bigint, rarity=enum/text |
| PK | id (uuid) |
| FK | — |
| UNIQUE | name |
| インデックス | is_active |
| RLS | 全認証ユーザー select 可。書き込みは管理者/サーバのみ |

> 限定称号・イベント称号・シークレット称号はPhase2（§8）。MVPは「マスタ＋獲得＋装備」のみ。

### `user_titles` — 分類: MVP必須
| 項目 | 内容 |
|---|---|
| 役割 | ユーザー獲得称号・装備中フラグ |
| 主なカラム | id, user_id, title_id, acquired_at, is_equipped, created_at |
| カラム型方針 | acquired_at=timestamptz, is_equipped=boolean |
| PK | id (uuid) |
| FK | user_id→auth.users.id, title_id→titles.id |
| UNIQUE | (user_id, title_id)（重複付与防止）。装備中は1件に制御（部分UNIQUE or サーバ制御） |
| インデックス | (user_id, is_equipped) |
| RLS | 本人select可。**解放（acquired）付与はサーバ経由**。装備切替は本人可（要レビュー） |

> 装備中称号は `profiles.current_title_id` と整合させる（どちらを正とするかは要レビュー）。

---

## 7. フレンド・招待

### `friendships` — 分類: P1必須（MVP後半）
| 項目 | 内容 |
|---|---|
| 役割 | フレンド関係（申請/承認/状態）。フレンドランキングの母集団 |
| 主なカラム | id, requester_id, receiver_id, status, requested_at, accepted_at, created_at, updated_at |
| カラム型方針 | status=enum/text（pending/accepted/blocked等）, 日時=timestamptz |
| PK | id (uuid) |
| FK | requester_id→auth.users.id, receiver_id→auth.users.id |
| UNIQUE | (requester_id, receiver_id)。(A,B)/(B,A)正規化は要レビュー（§17-7） |
| インデックス | requester_id, receiver_id, status |
| RLS | **当事者（requester/receiver）のみ** select/update 可 |

### `invitations`（または `referral_codes`） — 分類: MVP簡易版 / Phase1.5で本格化
| 項目 | 内容 |
|---|---|
| 役割 | 招待導線。**MVPは最低限の招待コード発行・参照のみ**。双方SP付与等の特典はPhase1.5 |
| 主なカラム | id, inviter_id, code, invitee_id, status, redeemed_at, created_at |
| カラム型方針 | code=text(短い一意コード), status=enum/text |
| PK | id (uuid) |
| FK | inviter_id→auth.users.id, invitee_id→auth.users.id（nullable） |
| UNIQUE | code |
| インデックス | code, inviter_id |
| RLS | 発行者は自分の招待を参照可。コード照合・**特典付与はサーバ経由**（不正な自己招待/多重付与をサーバで防止） |

### フレンドランキングに必要な設計（補足）
- 母集団 = `friendships` の `status='accepted'` な相手＋自分。
- 並び替えキー = 現行シーズンの `season_user_scores.season_point`（週間表示時は today_point/週次集計、確定値は snapshot）。
- 取得はサーバ側クエリ/RPCで「自分＋承認済みフレンドのスコアを join → 降順」（§R）。
- 公開可否は相手の `user_settings.show_on_ranking` を尊重。

---

## 8. 店舗・クーポン

### `stores` — 分類: MVP必須（公開マスタ）
| 項目 | 内容 |
|---|---|
| 役割 | 協賛店舗マスタ（B2B2Cの送客先） |
| 主なカラム | id, name, category, description, latitude, longitude, address, university_id, is_active, listed_from, listed_until, **image_url**, **opening_hours**, **map_url**, **instagram_url**, **display_order**, created_at, updated_at |
| カラム型方針 | 位置=numeric(緯度経度) or text(距離表示用), 期間=timestamptz/date, boolean。**（表示用・任意）image_url=text(public-assetsの画像), opening_hours=text or jsonb(曜日別営業時間), map_url=text(地図リンク), instagram_url=text(SNS導線), display_order=int(一覧の並び順)** |
| PK | id (uuid) |
| FK | university_id→universities.id（スコープ用・nullable可） |
| UNIQUE | （任意）name＋大学スコープ |
| インデックス | (university_id, is_active), category, display_order |
| RLS | 全認証ユーザー select 可（有効店舗）。書き込みは管理者/サーバのみ |

### `coupons` — 分類: MVP必須（公開マスタ）
| 項目 | 内容 |
|---|---|
| 役割 | クーポン定義（必要ポイント/在庫/有効期間） |
| 主なカラム | id, store_id, title, description, cost_points, stock_or_limit, valid_from, valid_until, is_active, created_at, updated_at |
| カラム型方針 | cost_points=int, stock_or_limit=int(null=無制限), 期間=timestamptz |
| PK | id (uuid) |
| FK | store_id→stores.id |
| UNIQUE | — |
| インデックス | (store_id, is_active), valid_until |
| RLS | 全認証ユーザー select 可（有効クーポン）。書き込みは管理者/サーバのみ |

### `coupon_redemptions` — 分類: MVP必須（改ざん厳禁・店舗課金の根拠）
| 項目 | 内容 |
|---|---|
| 役割 | クーポン引換と**店頭提示（利用確定）計測**。「取得」と「利用確定」を別イベントで記録 |
| 主なカラム | id, user_id, coupon_id, store_id, status, acquired_at, redeemed_at, verification_method, created_at |
| カラム型方針 | status=enum/text（acquired/redeemed/expired）, verification_method=enum/text, 日時=timestamptz |
| PK | id (uuid) |
| FK | user_id→auth.users.id, coupon_id→coupons.id, store_id→stores.id |
| UNIQUE | 重複利用防止キー（例: (user_id, coupon_id) ＝運用ルール確定後。§12） |
| インデックス | (store_id, redeemed_at)（店舗レポート用）, (user_id, status) |
| RLS | 本人は自分の引換を参照可。**「取得時のポイント消費」「利用確定（redeemed化）」はサーバ経由のみ**（クライアントから自由にredeemed化できない） |

---

## 9. 通知・設定

> `user_settings` は §1（認証・プロフィール）に記載。ここでは通知系を扱う。

### `notifications` — 分類: MVP最小限 / 高度配信はPhase2
| 項目 | 内容 |
|---|---|
| 役割 | アプリ内通知（既読管理）。MVPは最小限 |
| 主なカラム | id, user_id, notification_type, title, body, is_read, sent_at, created_at |
| カラム型方針 | notification_type=enum/text, is_read=boolean, **sent_at=timestamptz（旧date修正）** |
| PK | id (uuid) |
| FK | user_id→auth.users.id |
| UNIQUE | — |
| インデックス | (user_id, is_read), (user_id, created_at desc) |
| RLS | **本人のみ** select/update（既読化）可。生成はサーバ |

### `push_tokens` — 分類: Phase2（プッシュ配信）
| 項目 | 内容 |
|---|---|
| 役割 | プッシュ通知の端末トークン |
| 主なカラム | id, user_id, device_token, platform, is_active, created_at, updated_at |
| カラム型方針 | platform=enum/text, is_active=boolean |
| PK | id (uuid) |
| FK | user_id→auth.users.id |
| UNIQUE | (user_id, device_token) |
| インデックス | user_id |
| RLS | **本人のみ**（トークンは機微情報）。配信はサーバ |

> MVPは「アプリ内通知の最小限」までを想定し、プッシュ配信（push_tokens運用）と高度な通知配信はPhase2（§8）。

---

## 10. Storage（バケット設計）

| バケット | 分類 | 役割 | 公開/非公開 | アクセス方針 |
|---|---|---|---|---|
| `avatars` | MVP必須 | ユーザーのプロフィール画像（**ユーザーがアップロードする個人画像**） | 公開 or 署名URL | 本人のみアップロード/更新。読み取りは公開（または署名URL） |
| `mission-evidence` | MVP必須 | ミッション証跡画像（**個人の非公開記録**） | **非公開** | 本人＋サーバ（不正検知/レビュー）のみアクセス。署名URL経由配信。`mission_logs.evidence_image_url`と連動 |
| `public-assets` | MVP必須 | **運営が管理する公開固定画像**：店舗画像、店舗ロゴ、ミッションカテゴリ画像、アプリ内固定画像（バナー/アイコン等） | **公開（読み取り）** | 読み取りは全員可。**書き込み（アップロード/更新/削除）は管理者/サーバのみ**。`stores.image_url`, `mission_categories.icon_url` 等が参照 |

> **3バケットの用途を明確に分離する**:
> - `avatars` … ユーザー個人がアップロードする公開プロフィール画像。
> - `mission-evidence` … ユーザー個人の**非公開**証跡。他人に見えてはいけない。
> - `public-assets` … **運営が用意する公開固定画像**（店舗/カテゴリ/ロゴ/アプリ内素材）。ユーザーは書き込み不可。
> 画像URLをDBに保持する列（`avatar_url`→avatars, `evidence_image_url`→mission-evidence, `mission_categories.icon_url`／`stores.image_url`→public-assets）は、対応バケットのパス/URLを指す。証跡画像は他人に見えないようバケットRLSで保護。

---

## §R. ランキング取得設計（要件の明記）

MVPは **「体感リアルタイムランキング」** を満たす。以下をすべて満たす設計とする。

1. **即時更新（スコアのみ）**: ミッション達成後、サーバ計算（§S）の一部として `season_user_scores`（**season_point / today_point / last_scored_at**）を**即時更新**する。**`current_rank` は即時更新の対象にしない**（他ユーザー順位の連鎖再計算を避ける）。
2. **自分の現在順位**: **API/RPCでオンデマンド算出**する（同一スコープで「自分より上位の人数 + 1」を同点ルール準拠でカウント）。`current_rank` 列は保存する場合も**キャッシュ（近似）**であり、真実はオンデマンド値。
3. **自分の前後5〜10人**: 自分のスコアを基準に、同一スコープ（全体/大学/学部）で上下の近傍ウィンドウを取得できる。
4. **上位50人**: 同一スコープで `season_point desc`（＋同点ルール）の上位50件を取得できる。
5. **フレンドランキング**: `friendships(status=accepted)` の相手＋自分を `season_user_scores` と join し、同点ルール準拠の降順で取得できる。
6. **`ranking_snapshots` の位置づけ**: **MVPでは必須ではない**。週間/月間の**確定ランキング**、及び**大規模化後の集計負荷軽減（キャッシュ）**のための**補助**とする。リアルタイム表示は `season_user_scores` 直読みで賄う。
- **同点（タイブレーク）ルール（全ランキング共通）**: ①`season_point DESC` ②`last_scored_at ASC`（先に到達した人が上位）③`user_id ASC`。上位N・近傍・フレンド・snapshotすべてで統一。
- スコープ切替: 全体 / 大学(university_id) / 学部(faculty_id)。
- 公開可否: `user_settings.show_on_ranking` を尊重。
- 高速化: §4 `season_user_scores` のインデックス（`(season_id, season_point desc, last_scored_at asc, user_id asc)` 等）で上位N/近傍を効率取得。全件ソートをクライアントにさせない。

---

## §S. サーバー側更新（書き込み権限）方針の明記

以下の値は **クライアントから直接更新しない**。RLSでクライアントの insert/update を禁止し、**サーバー処理（Postgres RPC（SECURITY DEFINER）または Edge Function）経由のみ**で更新する。

| 対象 | 更新トリガ | 更新先 |
|---|---|---|
| EXP / レベル | ミッション達成・ボーナス | profiles.total_exp / profiles.level |
| スコア / SP / コイン | ミッション達成・報酬・クーポン消費 | profiles.total_score / season_user_scores.season_point・last_scored_at / profiles.coin_balance |
| 4ステータス | ミッション達成 | user_stats.intelligence/strength/vitality/charm |
| 現在順位 | 算出はオンデマンド（保存しない）／キャッシュ更新時はバッチ | season_user_scores.current_rank（キャッシュのみ・任意） |
| リーグ | スコア/シーズン更新時 | season_user_scores.league |
| 称号解放 | 解放条件達成 | user_titles（acquired付与） |
| クーポン利用確定 | 店頭提示検証 | coupon_redemptions.status=redeemed |
| 不正フラグ | 異常検知 | mission_logs.is_suspicious |

- クライアントは「ミッション実行結果（mission_id/所要時間/レビュー/証跡）」や「クーポン取得要求」を**送るだけ**。計算・確定はサーバ。
- これにより自己申告でのスコア水増し等の不正を**構造的に防止**する（ランキング・クーポンに実利益が絡むため真正性が必須）。

---

## §C. 分類サマリ（一覧）

### MVP必須
profiles / user_stats / user_settings / universities / faculties / university_verifications / mission_categories / missions / user_missions（daily＋self統合・§3） / mission_logs / score_logs / seasons / season_user_scores / titles / user_titles / stores / coupons / coupon_redemptions / （Storage）avatars / mission-evidence / public-assets

### P1必須（MVP後半）/ Phase1.5
- **P1必須**: friendships、フレンドランキング設計（season_user_scores直読みで実現）、ranking_snapshots（週間/月間確定の補助）
- **MVP簡易版→Phase1.5本格化**: invitations（または referral_codes）

### Phase2以降
chat / teams / events / advanced_notifications（高度配信） / store_admin（店舗管理画面） / store_reports（店舗向け月次レポート） / store_fanclubs（店舗ファンクラブ） / ai_coach / limited_titles（限定・イベント称号） / push_tokens（プッシュ配信運用） / daily_missions（自動日次配布） / goals・user_goals（目標選択）

---

## §X. 未確定・エンジニアレビュー事項（本書で確定しない）

- ID統一(uuid)の最終承認、独自`users`廃止の可否（`DB_REDESIGN_PLAN §17`）。
- 既存20テーブルを「マイグレーションで作り直す」か「新規プロジェクトで作り直す」か。
- `season_user_scores` への university_id/faculty_id 非正規化保持の是非（整合性 vs クエリ速度）。
- `score_logs.mission_log_id` のUNIQUE（二重加算防止）と冪等性設計。
- 装備中称号の真実を `profiles.current_title_id` と `user_titles.is_equipped` のどちらに置くか。
- friendships の双方向正規化／ブロック状態の持ち方。
- coupon_redemptions の重複利用UNIQUEキーと店頭提示の検証方式（QR/ワンタイム/店舗操作）。
- ランキング近傍/上位N取得の具体クエリとインデックス、スケール時のsnapshot移行設計。
- `user_missions` の部分UNIQUE（daily: (user_id, app_date, slot_no) を slot_no NOT NULL に限定）と、`app_date` の朝5時切替境界をサーバのどこで判定するか。
- `current_rank` をキャッシュ列として残すか完全にオンデマンドにするか（キャッシュ更新頻度・整合性）。
- 同点ルールの基準時刻を `last_scored_at`（スコア到達時刻）にするか `reached_at`（別途定義）にするか。
- 報酬冪等性の単位（`score_logs.mission_log_id` UNIQUE か別の `idempotency_key` か）と `completed_counted` との役割分担。

> 本書はMVPテーブル設計の**ドラフト**。`CREATE TABLE`/`ALTER`/RLSポリシーSQL/マイグレーションは含まず、レビュー合意後の別タスクで実装する。
