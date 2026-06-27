# KINDAI GROWTH — DB 再設計方針書（DB_REDESIGN_PLAN）

> 作成日: 2026-06-27
> 前提資料: `DB_CURRENT_STATE.md`（現状調査）/ `DB_GAP_ANALYSIS.md`（差分分析）
> 位置づけ: **既存Supabase DBを直接修正する前段の「方針合意」用ドキュメント**。
> **本書はSQL・マイグレーション・テーブル定義を含まない。** 方針のみを記述し、実装は別タスク（エンジニアレビュー後）に分離する。
> 本タスクで DB変更・src変更・認証設定変更・マイグレーション作成・機能実装は**一切行っていない**。

---

## 0. 用語・前提

- 「論理設計」= 何の情報を持つか（エンティティ・属性・関係）。
- 「物理設計」= 実際の型・ID戦略・制約・RLS・インデックス等の実装方法。
- 対象アプリ: 近畿大学生向け継続支援アプリ（RPG＋ランキング＋協賛店舗クーポンのB2B2C）。
- 現行フロント: Vite + React + localStorage（DB未接続）。

---

## 1. 現状DBの結論

- 既存Supabaseには**本番志向で設計された20テーブル**が存在し、**論理設計（何を持つか）は事業計画を広くカバーしている**（大学メール認証・4ステータス・シーズン/リーグ・称号・フレンド・通知/プッシュ・ランキング）。プロトタイプより遥かに本番仕様に近い。
- 一方で**物理設計は本番に耐えない**。重大な構造的欠陥が複数ある（§下表）。
- データはほぼ空（Authユーザー1件）で、**今が破壊的再設計を低コストで行える好機**。

| 重大課題 | 内容 |
|---|---|
| FK 0件 | 参照整合性が全く担保されていない |
| ID型不統一 | PK=`bigint` / 参照=`text` / 一部`uuid` で噛み合わない |
| RLSポリシー0件 | 全テーブルRLS有効だがポリシー無し＝deny-all（または service_role運用なら全権限露出） |
| auth二重管理 | 独自`users`(bigint)と`auth.users`(uuid)が非連動 |
| 型の誤用 | `bytea`(種別)・`time`(所要時間/日付)・`text`(updated_at)・`double`(通貨) |
| UNIQUE 0件 | email/username/domain/関係テーブルが重複可能 |
| 収益中核の欠落 | 店舗・クーポン・店頭提示カウントが未設計。学部(faculty)概念も無し |

---

## 2. なぜ既存DBをそのまま使わないのか

1. **セキュリティが成立しない**: RLSポリシーが0件。所有者制御が無く、`user_id`が`text`で`auth.uid()`(uuid)と比較できないため、安全なRLSをそのまま書けない。
2. **整合性が担保されない**: FKが0件で、ID型も不一致のため後付けFKも張れない。孤児行・不整合が必ず発生する。
3. **アプリ層で扱えないデータ型**: `bytea`の種別、`time`で持つ所要時間、`text`のupdated_at、`double`の通貨など、そのままではAPI/集計/表示に使えない。
4. **認証の土台が二重**: `auth.users`と独自`users`が分裂し、本番のセッション/権限設計が破綻する。
5. **収益モデルが載らない**: B2B2Cの核（店舗・クーポン・店頭提示カウント）が存在しない。

→ これらは「部分修正」では連鎖的に矛盾するため、**ID統一を起点に物理設計を作り直す**のが最短かつ安全。データが空の今なら移行コストが最小。

---

## 3. 既存DBから流用する論理設計（エンティティと関係の考え方）

以下の**エンティティ構造・属性の意図は流用**する（物理は作り直す）。

- **ユーザー領域**: プロフィール（表示名/ユーザー名/レベル/EXP/スコア/コイン/ストリーク）、4ステータス（知力=intelligence/体力=strength/活力=vitality/魅力=charm）、設定（通知/公開可否）、大学メール認証。
- **大学領域**: 大学マスタ（名称/ドメイン/都道府県）。※ここに**学部(faculty)を追加**。
- **ミッション領域**: カテゴリ（→対応ステータス）、ミッション定義（報酬: exp/sp/coin/score/各ステータス係数）、日次配布、ユーザー別進捗、実行ログ（所要時間/レビュー/証跡画像/不正フラグ）。
- **スコア/シーズン領域**: シーズン、シーズン別ユーザースコア（season_point/today_point/rank/league）、スコア増減履歴（score_logs）、ランキングスナップショット。
- **称号領域**: 称号マスタ（解放条件/レア度）、ユーザー獲得称号（装備フラグ）。
- **ソーシャル領域**: フレンド関係、アプリ内通知、プッシュトークン。

> 「カテゴリ→ステータス対応」「報酬の多資源化（exp/score/sp/coin＋4ステータス係数）」「シーズン/リーグ」「称号の解放条件」などは良い設計思想として**そのまま踏襲**する。

---

## 4. 作り直すべき物理設計

| 対象 | 現状 | 再設計方針 |
|---|---|---|
| 主キー/参照キーの型 | PK=bigint・参照=text/uuid混在 | **全エンティティのID/参照をuuidに統一**（§5） |
| ユーザー識別 | 独自`users`(bigint)とauth分裂 | **auth.users(uuid)を唯一の真実とし、profilesが参照**（§6） |
| 種別カラム | `bytea`(mission_type/difficulty/ranking_type) | enum or 制約付きtextへ |
| 所要時間 | `time`(min/max_duration_minutes, duration_minutes) | 整数（分）へ |
| 日時 | `date`/`text`(各*_at, updated_at) | **timestamptz**へ統一 |
| 通貨 | `double precision`(coin_balance) | **整数（最小単位）or numeric**へ（浮動小数禁止） |
| university_id | uuid・既定`gen_random_uuid()`（誤） | **既定値削除＋FK化**（ランダム付与バグの除去） |
| 制約 | FK/UNIQUE 0件 | **必須FK・必須UNIQUEを付与**（§8・§9） |
| 行レベル防御 | RLSポリシー0件 | **全テーブルにRLSポリシー**（§7） |
| 集計の持ち方 | snapshotの設計が曖昧 | ランキング集計テーブルを再定義（§13） |

---

## 5. ID設計方針

- **全テーブルの主キーは `uuid`（既定 `gen_random_uuid()`）に統一**する。
  - 例外的に「不変マスタの順序」が要る場合のみ、別途 `sort_order` 等の整数列で表現（PKは uuid のまま）。
- **すべての外部参照カラムも `uuid`** とし、参照先PKと型を一致させる。
- ユーザーを指す列は原則 **`user_id uuid` = `auth.users.id`** に統一（`text`のuser_idは廃止）。
- bigintの連番PKは廃止（列挙されると推測されやすく、分散採番にも不向きなため uuid を採用）。
- **理由**: ①`auth.uid()`(uuid)と直接比較でき安全なRLSが書ける ②FKが型的に成立する ③将来の複数大学・分散運用に強い。

---

## 6. auth.users と profiles/users の連携方針

- **`auth.users`（Supabase Auth）を唯一の認証主体（source of truth）とする。**
- 独自 `public.users` テーブルは**原則廃止**。残す必要がある場合も「アプリ用プロフィールの入れ物」に役割を限定し、PKを `auth.users.id` 参照の uuid にする（emailはauth側に寄せ、重複保持しない）。
- アプリ固有情報は **`profiles`（旧 user_profiles）** に集約し、**`profiles.id` または `profiles.user_id` を `auth.users.id` への FK（uuid）** とする（1ユーザー1プロフィール＝UNIQUE）。
- 新規ユーザー作成時に profiles 行を自動生成する仕組み（例: サインアップ後トリガ/サーバ処理）を将来用意する想定（本書では方針のみ。実装は別タスク）。
- すべての `user_id` 系列は `auth.users.id` を指すように一本化する。

---

## 7. RLS方針

**原則: 全テーブルでRLS有効＋明示ポリシー。ポリシー無しのRLS有効（現状）は放置しない。**

- **所有者専用データ**（profiles, user_stats, user_settings, user_missions, mission_logs, score_logs, season_user_scores, user_titles, notifications, push_tokens, university_verifications 等）
  - `select/insert/update/delete` は **`auth.uid() = user_id`** の所有者のみ。
- **公開マスタ**（universities, faculties, mission_categories, missions, titles, seasons, stores, coupons 等）
  - `select` のみ全認証ユーザーに許可。`insert/update/delete` は管理者/サーバのみ（クライアント不可）。
- **集計/ランキング**（ranking_snapshots, season_user_scores の公開部分）
  - 公開対象は `select` を許可するが、**`user_settings.show_on_ranking` を尊重**する設計とする。
  - 書き込みは**サーバ（Edge Function/サービスロール）専用**。
- **関係データ**（friendships）
  - requester / receiver の**当事者のみ** select/update 可能。
- **改ざん厳禁データ**（score_logs, season_user_scores, ranking_snapshots, coin残高への加算）
  - クライアントからの直接 `insert/update` を**禁止**し、サーバ計算経由のみ（§14）。
- `service_role` key は**サーバ側のみ**で使用し、**クライアント（Vite/React）には絶対に置かない**（§16）。

---

## 8. 必須UNIQUE制約（方針）

- `auth.users.email`（auth側で担保）。独自usersを残す場合も email UNIQUE。
- `profiles.username`（表示用ハンドルの一意性）。
- `profiles.user_id`（1ユーザー1プロフィール）。
- `universities.domain`（大学判定キーの一意性）。
- `user_stats.user_id` / `user_settings.user_id`（1対1保証）。
- `season_user_scores(user_id, season_id)`（シーズン×ユーザーで1行）。
- `user_missions(user_id, mission_id, assigned_date)`（同日重複配布の防止）。
- `user_titles(user_id, title_id)`（同一称号の重複付与防止）。
- `friendships(requester_id, receiver_id)`（重複申請防止。双方向重複の扱いは要検討＝§17）。
- `push_tokens(user_id, device_token)`（端末トークン重複防止）。
- （新規）`coupon_redemptions` の重複利用防止キー（§12で定義）。

---

## 9. 必須FK制約（方針）

ID uuid 統一後、以下の参照に**FKを付与**（ON DELETE はデータ性質に応じ cascade / set null / restrict を個別判断）。

- `profiles.user_id → auth.users.id`
- `profiles.university_id → universities.id`、（新規）`profiles.faculty_id → faculties.id`、`profiles.current_title_id → titles.id`
- `user_stats.user_id / user_settings.user_id → auth.users.id`
- `university_verifications.user_id → auth.users.id`、`.university_id → universities.id`
- （新規）`faculties.university_id → universities.id`
- `missions.category_id → mission_categories.id`
- `daily_missions.mission_id → missions.id`、`.target_user_id → auth.users.id`
- `user_missions.user_id → auth.users.id`、`.mission_id → missions.id`
- `mission_logs.user_id → auth.users.id`、`.mission_id → missions.id`、`.user_mission_id → user_missions.id`
- `score_logs.user_id → auth.users.id`、`.mission_log_id → mission_logs.id`、`.season_id → seasons.id`
- `season_user_scores.user_id → auth.users.id`、`.season_id → seasons.id`
- `ranking_snapshots.season_id → seasons.id`、`.university_id → universities.id`、`.user_id → auth.users.id`
- `user_titles.user_id → auth.users.id`、`.title_id → titles.id`
- `friendships.requester_id / receiver_id → auth.users.id`
- `notifications.user_id → auth.users.id`、`push_tokens.user_id → auth.users.id`
- （新規）`coupons.store_id → stores.id`、`coupon_redemptions.user_id → auth.users.id`、`.coupon_id → coupons.id`

---

## 10. MVPで必要なテーブル一覧

「記録ループ＋ランキング＋クーポンが回る最小構成」を MVP とする。

| 領域 | テーブル |
|---|---|
| 認証/ユーザー | `auth.users`（標準）, `profiles`, `user_stats`, `user_settings` |
| 大学/学部 | `universities`, `faculties`, `university_verifications` |
| ミッション | `mission_categories`, `missions`, `user_missions`, `mission_logs` |
| スコア | `score_logs`, `seasons`, `season_user_scores` |
| ランキング | `ranking_snapshots`（または集計ビュー、§13） |
| 店舗/クーポン | `stores`, `coupons`, `coupon_redemptions` |
| Storage | `avatars`, `mission-evidence`（バケット） |

> MVPでも **学部(faculties)** と **店舗/クーポン** は含める（事業計画の差別化・収益の核のため）。

---

## 11. Phase2以降に回すテーブル一覧

| テーブル | 理由（後回し可） |
|---|---|
| `titles`, `user_titles`（称号） | 事業計画上も2027Q1の継続施策。MVPの動作に必須ではない |
| `friendships`（フレンド） | フレンドランキングはPhase2でも成立。MVPは学内/学部ランキング優先 |
| `notifications`, `push_tokens`（通知/プッシュ） | リテンション施策。MVP検証後に追加 |
| `daily_missions`（自動日次配布） | MVPは固定/手動ミッションでも回る。配布自動化はPhase2 |
| `goals` / `user_goals`（目標選択） | 登録UX改善。MVPは既定ミッションで代替可 |
| `invitations`（招待コード） | 成長施策。Phase2 |
| `events`（季節イベント） | 長期運用施策。Phase2以降 |

---

## 12. 店舗・クーポン・店頭提示カウントの追加方針

B2B2Cの収益中核。新規に以下のエンティティを設計する（属性は方針レベル）。

- **`stores`（協賛店舗）**: 店舗名/カテゴリ/位置（緯度経度 or 距離表示用）/大学or学部スコープ/掲載期間/有効フラグ。
- **`coupons`（クーポン定義）**: 所属店舗(store_id)/タイトル/必要ポイント/在庫or発行上限/有効期間/有効フラグ。
- **`coupon_redemptions`（引換・店頭提示計測）**: user_id/coupon_id/取得日時/**店頭提示（利用確定）日時**/状態（取得済/利用済/失効）。
  - **店舗課金の根拠**になるため、**「取得」と「店頭での利用確定」を別イベントとして記録**する。
  - 利用確定は**改ざん不可にする**（クライアントから自由に「利用済」化できない）。確定手段は店舗側操作 or ワンタイムコード提示などをサーバ検証（具体方式は§17でエンジニアレビュー）。
  - 重複利用防止のUNIQUEキー（例: 1クーポン1ユーザー1回 等、運用ルール確定後に定義）。
- 集計（店舗向け月次レポート: 表示数/取得数/利用数）は**サーバ集計**で生成する方針（保存先テーブル or 集計ビューはPhase設計時に決定）。

---

## 13. ランキング用集計テーブル方針

- **原則: ランキングはリアルタイム全件ソートをクライアントにさせない。** サーバ側で定期集計し、読み取り最適化された形を提供する。
- **`season_user_scores`** を「現在のシーズン累計/当日ポイント/現在順位/リーグ」を保持する**集計の主テーブル**とする（ユーザー×シーズンでUNIQUE）。
- **`ranking_snapshots`** は「**週間/月間 × 全体/大学/学部** の確定済みランキング」を時点保存するテーブルとして再定義する。
  - 次元として **faculty を追加**（事業計画の学部別ランキング要件）。
  - `ranking_type` は enum/text（例: weekly/monthly × overall/university/faculty）。
- 集計の更新は **Edge Function ＋ スケジュール（cron）** で実行（書き込みはサーバ専用、RLSで保護）。
- 公開可否は `user_settings.show_on_ranking` を反映。
- 大量データ時に備え、集計クエリ用のインデックス方針は実装時に設計（本書では「集計はサーバ・公開は読み取り専用」までを確定）。

---

## 14. SP/EXP/ステータス計算をサーバー側に寄せる方針

- **計算ロジック（exp/score/sp/coin・4ステータス増減・レベルアップ・ストリーク判定・不正検知）は、現行プロトタイプのようにクライアントで行わず、サーバー（Edge Function / RPC）に一元化する。**
- フローの考え方:
  1. クライアントは「ミッション実行結果（mission_id・所要時間・レビュー・証跡）」を送るだけ。
  2. サーバーが報酬を計算し、`mission_logs` / `score_logs` を記録、`profiles`・`user_stats`・`season_user_scores` を更新。
  3. クライアントは更新後の値を読み取るだけ（書き込み権限を持たせない）。
- **改ざん厳禁の数値**（score/sp/coin/level/stats/rank）は、**クライアントからの直接 `update` をRLSで禁止**し、サーバ計算経由のみとする。
- これにより「自己申告でSPを盛る」不正を構造的に防ぎ、`mission_logs.is_suspicious` の不正検知もサーバ側で一貫処理できる。
- **理由**: ランキング・クーポン（実利益）が絡むため、スコアの真正性が事業の信頼性に直結する。

---

## 15. 既存localStorageプロトタイプからDB接続へ移行する順序

段階移行（各段階で動作確認。**一度に全部やらない**）:

1. **方針確定（本書）** → エンジニアレビュー → 物理設計（別タスク・SQL/マイグレーションはそこで作成）。
2. **認証の土台**: Supabase Auth（大学メール認証）導入。`profiles` 自動生成までを通す。
3. **読み取り移行**: マスタ（大学/学部/ミッション/カテゴリ）をDBから読む。書き込みはまだローカルでも可。
4. **記録ループのサーバ化**: ミッション完了をサーバ計算（§14）に置換。`mission_logs`/`score_logs`/`profiles`/`user_stats` をDB真実に。
5. **ランキングのDB化**: `season_user_scores` / `ranking_snapshots`（集計はサーバ）に接続。localStorage集計を廃止。
6. **店舗/クーポン**: `stores`/`coupons`/`coupon_redemptions` を接続。店頭提示計測を有効化。
7. **localStorage依存の撤去**: 永続化をDBに完全移行し、localStorageはキャッシュ/オフライン用途に限定 or 廃止。
8. **Phase2機能**（称号/フレンド/通知/イベント等）を順次接続。

> 各段階で `backup/current-vite-prototype` を安全網として保持。移行はブランチを分けて実施。

---

## 16. 絶対にやってはいけないこと

- ❌ **`service_role` key をクライアント（Vite/React）コードや`.env`（公開ビルドに載る変数）に置く** — RLSを全バイパスでき致命的。サーバ専用。
- ❌ **RLSポリシー未定義のまま本番公開** — deny-allで動かない、もしくは抜け穴を作る。
- ❌ **score/sp/coin/level/stats/rank をクライアントから直接更新可能にする** — 不正の温床。サーバ計算経由のみ。
- ❌ **ID型を統一しないまま部分的にFKを足す** — 連鎖矛盾。先にuuid統一。
- ❌ **既存DBに対し、本方針の合意とバックアップ前に破壊的変更（DROP/ALTER）を実行する** — 復旧不能リスク。
- ❌ **認証コード（university_verifications）やデバイストークンを平文・無期限で保持** — ハッシュ化＋失効。
- ❌ **通貨を浮動小数（double）で保持** — 誤差で残高がズレる。
- ❌ **個人情報/メール/位置情報を公開ランキングやpublic selectに露出** — 公開範囲は明示ポリシーで限定。
- ❌ **本番DBで直接ぶっつけ作業** — マイグレーションはレビュー＋検証環境を通す。

---

## 17. エンジニアレビューが必要な箇所

実装着手前に、エンジニア（または上位設計者）の判断を仰ぐべき論点:

1. **ID戦略の最終決定**: uuid統一でよいか（bigint併用や採番方針の是非）。
2. **独自`users`の廃止可否**: auth.usersへ完全一本化するか、移行措置を挟むか。
3. **既存DBの扱い**: 既存20テーブルを「マイグレーションで作り直す」か「新規プロジェクトに作り直して移植」か。データはほぼ空である前提の再確認。
4. **スコア計算のサーバ実装形態**: Edge Function / Postgres RPC（SECURITY DEFINER）/ どちらを主にするか。
5. **店頭提示カウントの確定方式**: 店舗側操作・ワンタイムコード・QR等、不正と運用負荷のバランス。課金根拠としての証跡要件。
6. **ランキング集計の頻度と方法**: cron間隔、snapshot粒度（週間/月間×全体/大学/学部）、大規模時のインデックス/パーティション。
7. **friendshipsの重複・双方向設計**: (A,B)と(B,A)の正規化、ブロック/拒否状態の持ち方。
8. **RLSの公開範囲**: ランキング公開時に何を見せ、何を隠すか（氏名/アバター/学部の露出範囲）。
9. **大学メール認証の方式**: Supabase Authのメール確認で代替可能か、独自検証コードを併用するか、ドメイン制限の実装場所。
10. **未確定事項の確認**（DB_CURRENT_STATEより）: Edge Functionsの有無・Authプロバイダ設定・各テーブル実データ件数。

---

## 18. 本書のスコープ外（次タスク）

- SQL・マイグレーション・テーブルDDLの作成（**本書では一切書かない**）。
- RLSポリシーの具体記述、Edge Functionの実装。
- アプリ（Vite/React）へのSupabase接続実装。
- 上記はすべて**本方針のレビュー・合意後**に、別ブランチ・別タスクで着手する。
