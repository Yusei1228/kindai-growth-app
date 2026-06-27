# KINDAI GROWTH — Supabase DB ギャップ分析（DB_GAP_ANALYSIS）

> 作成日: 2026-06-27
> 前提資料: `DB_CURRENT_STATE.md`（読み取り専用調査の結果）
> 本ファイルは差分整理のみ。**DB・src は変更していない。**
> 凡例（最新仕様で使えるか）: ◎ ほぼ流用可 / ◯ 補修すれば流用可 / △ 大幅修正 / ✕ 作り直し・新規

---

## A. 既存テーブル差分表（20テーブル）

| 既存テーブル名 | 現在の役割 | 最新仕様で使えるか | 不足カラム / 型の問題 | セキュリティ上の懸念 | 対応方針 |
|---|---|---|---|---|---|
| `users` | 独自ユーザー（email等） | △ | `id`=bigintで`auth.users`(uuid)と非連動。email一意制約なし | auth二重管理→ID不整合・なりすまし余地。email重複可 | 原則廃止し`auth.users`へ統一。残すなら`auth.users.id`(uuid)参照に再設計 |
| `user_profiles` | プロフィール/レベル/通貨 | ◯ | `user_id`=text(uuidにすべき)、`university_id`=uuidで既定`gen_random_uuid()`（誤）、`coin_balance`=double（通貨にfloat）、faculty_id無し、current_title_idのFK無し | RLSポリシー無し（所有者制御不在）、university自動ランダム付与バグ | user_id→uuid+FK(auth.users)、university_id既定削除+FK、coin→bigint/numeric、faculty_id追加、RLS追加 |
| `user_stats` | 4ステータス | ◎ | `user_id`=text | RLSポリシー無し | user_id→uuid+FK、(user_id)UNIQUE、RLS追加 |
| `user_settings` | 通知/公開設定 | ◎ | `user_id`=text | RLSポリシー無し | user_id→uuid+FK、(user_id)UNIQUE、RLS追加 |
| `university_verifications` | 大学メール認証 | ◯ | `verification_code`=平文text、`updated_at`=**text型**、user_id/university_id=text | 認証コード平文保存・失効設計なし | コードはハッシュ+期限、updated_at→timestamptz、FK化、RLS追加 |
| `universities` | 大学マスタ | ◎ | `domain`一意制約なし、学部概念なし | （マスタ）読み取り公開ポリシー要 | domainにUNIQUE、faculties分離、read公開RLS |
| `mission_categories` | カテゴリ→ステータス対応 | ◎ | `updated_at`=**text型** | read公開ポリシー要 | updated_at→timestamptz、read公開RLS |
| `missions` | ミッション定義/報酬係数 | ◯ | `mission_type`/`difficulty`=**bytea**、`min/max_duration_minutes`=**time**、`category_id`=text、coefficient=int | read公開ポリシー要 | bytea→text/enum、time→int(分)、category_id→FK、read公開RLS |
| `daily_missions` | 日次配布ミッション | ◯ | `assigned_date`=**time型(日付であるべき)**、mission_id/target_user_id=text | RLSポリシー無し | assigned_date→date、FK化、RLS追加 |
| `user_missions` | ユーザー別ミッション進捗 | ◯ | `started_at/completed_at/expires_at`=date(timestamptz推奨)、user_id/mission_id=text、(user_id,mission_id,assigned_date)一意なし | RLSポリシー無し | 日時→timestamptz、FK化、複合UNIQUE、RLS追加 |
| `mission_logs` | 実行ログ/証跡/レビュー | ◯ | `started_at/ended_at`=date、`duration_minutes`=**time**、各id=text | RLSポリシー無し、証跡画像のアクセス制御 | 日時→timestamptz、duration→int、FK化、RLS追加 |
| `score_logs` | スコア/ステータス増減履歴 | ◎ | 各id=text | RLSポリシー無し（改ざん防止に書込制限要） | FK化、書込はサーバ(Function)経由に限定、RLS追加 |
| `seasons` | シーズン定義 | ◎ | — | read公開ポリシー要 | read公開RLS（必要十分） |
| `season_user_scores` | シーズン別スコア/順位/リーグ | ◎ | user_id/season_id=text、(user_id,season_id)一意なし | RLSポリシー無し | FK化、(user_id,season_id)UNIQUE、read公開/write制限RLS |
| `ranking_snapshots` | ランキング集計結果 | ◯ | `ranking_type`=**bytea**、各id=text、学部次元なし | RLSポリシー無し | bytea→text/enum、FK化、faculty次元追加、read公開RLS |
| `titles` | 称号マスタ | ◎ | — | read公開ポリシー要 | read公開RLS |
| `user_titles` | ユーザー獲得称号 | ◎ | user_id/title_id=text、(user_id,title_id)一意なし | RLSポリシー無し | FK化、複合UNIQUE、RLS追加 |
| `friendships` | フレンド関係 | ◯ | requester_id/receiver_id=text、`requested_at/accepted_at`=date、(requester,receiver)一意なし | RLSポリシー無し（双方のみ可視にすべき） | id→uuid+FK、日時→timestamptz、複合UNIQUE、RLS追加 |
| `notifications` | アプリ内通知 | ◎ | `sent_at`=date、user_id=text | RLSポリシー無し（本人のみ可視） | sent_at→timestamptz、FK化、所有者RLS |
| `push_tokens` | プッシュ端末トークン | ◯ | user_id=text、(user_id,device_token)一意なし | RLSポリシー無し・トークンは機微情報 | FK化、複合UNIQUE、所有者限定RLS |

---

## B. 横断的な問題（全テーブル共通）

| 問題 | 影響 | 対応方針 |
|---|---|---|
| **FKが0件** | 参照整合性なし。孤児行・不整合データが発生 | ID型統一後に全リレーションへFK付与 |
| **ID型の不統一**（PK=bigint / 参照=text / 一部uuid） | そもそもFKが張れない。RLSで`auth.uid()`と比較不可 | **uuidに統一**（`auth.users`連携前提）して再設計 |
| **RLSポリシー0件** | deny-all（クライアント不能） or service_role運用なら全権限露出 | テーブル毎に所有者/公開ポリシーを定義 |
| **UNIQUE制約0件** | email/username/domain/関係テーブルで重複可 | 業務キーへUNIQUE付与 |
| **型の誤用**（bytea/time/text日時/float通貨） | アプリ層で扱えない・集計不能・通貨誤差 | enum/int/timestamptz/numericへ修正 |
| **Storageバケット無し** | avatar/証跡画像の保存先が無い | `avatars`,`mission-evidence`バケット作成+RLS |

---

## C. 新規追加が必要なテーブル（最新仕様の欠落）

| 追加テーブル(案) | 目的 | 優先度 |
|---|---|---|
| `stores` / `partner_stores` | 協賛店舗マスタ（B2B2C） | 高 |
| `coupons` | クーポン定義（必要ポイント等） | 高 |
| `coupon_redemptions` | 引換・**店頭提示カウント**（店舗課金の根拠） | 高 |
| `faculties` ＋ `user_profiles.faculty_id` | 学部別ランキング（事業計画要件） | 高 |
| `goals` / `user_goals` | 登録時の目標選択（TOEIC/筋トレ等） | 中 |
| `invitations` | 招待コード（双方SP付与） | 中 |
| `events` | 季節イベント（夏の累計ランキング等） | 中 |
| （Storage）`avatars`, `mission-evidence` | 画像保存 | 中 |

---

## D. 本番化に向けた優先順位（サマリ）

1. **ID戦略の確定（uuid統一）と auth.users への一本化** — 全ての土台。`users`独自テーブルの扱いを決める。
2. **RLSポリシー整備** — セキュリティの生命線。所有者制御＋公開マスタの読み取り。
3. **型の修正**（bytea/time/text日時/float通貨）と **FK・UNIQUE 付与**。
4. **店舗・クーポン・学部の新規テーブル追加**（収益・ランキングの仕様充足）。
5. **Storageバケット**と**Edge Functions**（スコア計算・ランキング集計・不正検知・プッシュ）整備。
6. アプリ（Vite/React）への Supabase 接続実装（※本タスク範囲外。今回は未実施）。

---

## E. 判断メモ

- **「作り直し」か「流用」か**: テーブルの**論理設計（何を持つか）は良質**で事業計画を広くカバーしているため、**全面作り直しは不要**。ただし**物理設計（型・ID・FK・RLS）は本番に耐えないため、移行用の再設計マイグレーションが前提**。実質「論理は流用、物理は作り直し」。
- 既存DBには重要データがほぼ無い（ユーザー1件）ため、**今ならID型統一を含む破壊的再設計を低コストで実施できる**フェーズ。
- 本ファイルは現状把握と差分整理が目的。実際のマイグレーション・RLS実装・接続実装は**別タスク**で、承認の上で着手する。
