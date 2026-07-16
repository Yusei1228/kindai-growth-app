# KINDAI GROWTH — 50人検証プロトタイプ

近畿大学生向け「努力が見える・続く・得をする」継続支援アプリの **検証用プロトタイプ**。
最大30〜50人の近大生に1〜2週間使ってもらい、以下の仮説を検証することが目的です。

1. デイリーミッションが行動のきっかけになるか
2. セルフミッションで自分の努力を記録できるか
3. 努力がスコア・EXP・ステータスで可視化されると継続意欲が上がるか
4. ランキングで自分の位置が分かると継続意欲が上がるか
5. 50人程度が同じランキングを共有できるか

> 完成度の高い本番アプリではなく「検証に必要な最小機能」に絞っています。
> 本格認証・決済・店舗運用・厳密なRLS・6000人対応などは対象外です。

---

## 実装した検証機能

| 画面 | 内容 |
|---|---|
| ニックネーム登録 | UUID発行＋localStorage保持（メール/本名/電話は不要） |
| ホーム | プロフィール・レベル・4ステータス・ミッション導線 |
| デイリーミッション | **毎日入れ替わる3件**（タイマー→レビュー→達成） |
| セルフミッション | プリセット選択 or 自由入力で自分の努力を記録 |
| ステータス/マイページ | 知力・体力(筋力)・活力・魅力、累計サマリ |
| ランキング | **累計スコア順**・自分の順位・上位◯％・上位10人・自分の前後5人 |
| 振り返り | 週間グラフ・記録履歴 |

### スコア仕様（50人検証用の簡易仕様）
- デイリーミッション達成：**スコア +50 / EXP +30 / 該当ステータス +3**
- セルフミッション達成：**スコア +30 / EXP +20 / 該当ステータス +2**
- デイリー3件全達成ボーナス：**スコア +50**
- EXPが閾値（`80 + level×60`）を超えるとレベルアップ
- カテゴリ→ステータス：勉強→知力 / 運動→体力 / 生活習慣→活力 / 振り返り→魅力
- ランキングは `user_stats.total_score`（＝累計スコア）で決定

### 認証（A案）
ニックネーム入力 → `crypto.randomUUID()` で user_id 発行 → localStorage保持 → Supabaseに保存。
個人情報は一切取得しません。

---

## 技術
- Vite + React 18 + TypeScript
- 状態：React Context + localStorage（端末内）
- 共通ランキング：Supabase（`@supabase/supabase-js`）
- **Supabase未設定でもUIは動作**（ランキングはローカルのダミー表示にフォールバック）。
  50人の共通ランキング検証には Supabase 設定が必須です。

---

## セットアップ手順

### 1. 依存インストール・ローカル起動
```bash
cd kindai-growth-app
npm install
npm run dev      # http://localhost:5173（モバイル幅430px想定）
```

### 2. Supabase（共通ランキング）を有効化
1. [supabase.com](https://supabase.com) で**検証用の新規プロジェクト**を作成（既存の20テーブルとは分離）。
2. **SQL Editor** で `supabase/schema.sql` を実行（4テーブル＋検証用RLS＋デイリー初期データ）。
3. （任意）`supabase/seed_dummy_users.sql` を実行するとダミー49人でランキングの見た目を確認できます。
4. **Project Settings → API** から `Project URL` と `anon public key` をコピー。
5. プロジェクト直下に `.env` を作成（`.env.example` をコピー）し、2つの値を設定：
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
6. `npm run dev` を再起動。ランキング画面下部の「ローカル表示」表記が消えれば接続成功。

> anon key はクライアントに露出する**公開キー**です（そのまま配布して問題ありません）。
> 検証版のRLSは「全員read/insert/update可・delete不可」の簡易構成です。本番では要作り直し。

### 3. 友人へ配布（デプロイ）
Vercel か Netlify の無料枠を推奨。
```bash
npm run build    # dist/ を生成
```
- Vercel：GitHub連携 or `vercel` CLI でデプロイ。環境変数に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を登録。
- 発行されたURLをLINE等で共有 → スマホのブラウザで開くだけで参加できます。

---

## 検証データの確認
- **参加人数・スコア**：Supabase Table Editor の `user_stats`（`total_score` 降順）
- **利用ログ**：`mission_logs`（`mission_type` = daily/self、`app_date` 別）
- **登録者**：`profiles`

---

## データベース（検証用・最小4テーブル）
- `profiles(id, nickname, created_at)`
- `user_stats(user_id, level, exp, total_score, intelligence, strength, vitality, charm, updated_at)`
- `mission_logs(id, user_id, mission_type, mission_title, category, score, exp, completed_at, app_date)`
- `daily_missions(id, title, category, score, exp, is_active)`

詳細な本番志向の設計・ゲームロジックは `docs/` を参照（本プロトタイプは簡易版）。

---

## 画面フロー
ニックネーム登録 → ホーム → デイリー/セルフ → 達成 → スコア・EXP・ステータス反映 → ランキングで順位確認
