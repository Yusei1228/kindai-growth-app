// ワイヤーフレーム（ホーム画面）準拠のリング型ステータスゲージ
export function StatRing({ label, value, emoji, color }: { label: string; value: number; emoji: string; color: string }) {
  const r = 32
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = c * (1 - pct / 100)
  return (
    <div className="stat-ring">
      <div className="sr-label">{label}</div>
      <div className="sr-wrap">
        <svg viewBox="0 0 80 80" className="sr-svg">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#eef2f7" strokeWidth="7" />
          <circle
            cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 40 40)"
          />
        </svg>
        <span className="sr-emoji">{emoji}</span>
      </div>
      <div className="sr-val">{value}<span className="sr-max"> / 100</span></div>
    </div>
  )
}
