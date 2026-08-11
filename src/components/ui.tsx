import { useEffect } from 'react'

/** SP（スコア）アイコン：青バッジに「SP」表記 */
export function GemIcon() {
  return (
    <svg className="gem" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#spGrad)" stroke="#1d4ed8" strokeWidth="1" />
      <text x="12" y="15.4" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#fff" fontFamily="-apple-system, 'Segoe UI', sans-serif" letterSpacing="0.3">SP</text>
    </svg>
  )
}

/** ポイント（コイン）アイコン：金貨風 */
export function PointIcon() {
  return (
    <svg className="gem" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#coinGrad)" stroke="#d97706" strokeWidth="1" />
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="#d9a441" strokeWidth="1.2" opacity="0.8" />
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="900" fill="#b45309" fontFamily="-apple-system, 'Segoe UI', sans-serif">P</text>
      <ellipse cx="9" cy="8" rx="2.4" ry="1.4" fill="#fff" opacity="0.55" transform="rotate(-25 9 8)" />
    </svg>
  )
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [message, onDone])
  return <div className="toast">{message}</div>
}

export function PageHead({ title, onBack, action }: { title: string; onBack?: () => void; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      {onBack ? (
        <button className="back" onClick={onBack} aria-label="戻る">←</button>
      ) : (
        <span className="spacer" />
      )}
      <h1>{title}</h1>
      {action ?? <span className="spacer" />}
    </div>
  )
}
