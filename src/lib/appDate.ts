// ===== アプリ論理日付（app_date）=====
// GAME_LOGIC.md §3.5: 基準TZ=JST・朝5時切替（04:59までは前日扱い）。
// 検証版ではクライアント側で算出する（サーバー厳密判定はスコープ外）。

/** JSTで「5時間引いた日時」の日付を yyyy-mm-dd で返す */
export function appDate(now: Date = new Date()): string {
  // JST（UTC+9）に変換 → さらに5時間引く（朝5時切替）→ 日付部分
  const jstMs = now.getTime() + 9 * 3600_000
  const shifted = new Date(jstMs - 5 * 3600_000)
  return shifted.toISOString().slice(0, 10)
}

/** app_date から決定的な数値シード（毎日入れ替わるデイリー抽選用） */
export function dateSeed(date: string = appDate()): number {
  let h = 2166136261
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
