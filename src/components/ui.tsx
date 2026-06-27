import { useEffect } from 'react'

/** 上部の青ダイヤ（SP）アイコン */
export function GemIcon() {
  return (
    <svg className="gem" viewBox="0 0 24 24" fill="none">
      <path d="M6 3h12l3 5-9 13L3 8l3-5z" fill="#3b82f6" />
      <path d="M6 3h12l3 5H3l3-5z" fill="#60a5fa" />
      <path d="M3 8h18l-9 13L3 8z" fill="#2563eb" opacity=".85" />
    </svg>
  )
}

/** 上部の緑ポイント（P）アイコン */
export function PointIcon() {
  return (
    <svg className="gem" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#22c55e" />
      <text x="12" y="16" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">P</text>
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
