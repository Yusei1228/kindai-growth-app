// 円形ゲージ（グラデーション・太め）＋アイコン。ガラスパネル上で重厚に見せる。
export function StatRing({ label, value, emoji, c1, c2 }: { label: string; value: number; emoji: string; c1: string; c2: string }) {
  const r = 29
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = c * (1 - pct / 100)
  const gid = 'sg' + c2.replace('#', '')
  return (
    <div className="stat-ring">
      <div className="sr-wrap">
        <svg viewBox="0 0 76 76" className="sr-svg">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={c1} />
              <stop offset="1" stopColor={c2} />
            </linearGradient>
          </defs>
          {/* 丸い土台（重厚感・四角枠なし） */}
          <circle cx="38" cy="38" r="34" fill="rgba(255,255,255,0.5)" />
          {/* トラック */}
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="8" />
          {/* 進捗（グラデ） */}
          <circle
            cx="38" cy="38" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90 38 38)"
          />
        </svg>
        <span className="sr-emoji">{emoji}</span>
      </div>
      <div className="sr-val">{value}</div>
      <div className="sr-label">{label}</div>
    </div>
  )
}
