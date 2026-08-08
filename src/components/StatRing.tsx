// 円形ゲージ（進捗を視覚で表現）＋アイコン。枠なしで背景になじむコンパクト表示。
// 文字は最小限（値＋短いラベルのみ、/100は省略＝リングが割合を示す）。
export function StatRing({ label, value, emoji, color }: { label: string; value: number; emoji: string; color: string }) {
  const r = 30
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = c * (1 - pct / 100)
  return (
    <div className="stat-ring">
      <div className="sr-wrap">
        <svg viewBox="0 0 76 76" className="sr-svg">
          {/* 背景の淡いディスク（写真上でも視認しやすく） */}
          <circle cx="38" cy="38" r="33" fill="rgba(255,255,255,0.45)" />
          {/* トラック */}
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="7" />
          {/* 進捗 */}
          <circle
            cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
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
