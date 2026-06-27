export type Tab = 'home' | 'ranking' | 'reflection' | 'mypage' | 'menu'

const ITEMS: { key: Tab; label: string; ico: string; badge?: number }[] = [
  { key: 'home', label: 'ホーム', ico: '🏠' },
  { key: 'ranking', label: 'ランキング', ico: '🏆' },
  { key: 'reflection', label: '振り返り', ico: '📈', badge: 1 },
  { key: 'mypage', label: 'マイページ', ico: '👤' },
  { key: 'menu', label: 'メニュー', ico: '☰', badge: 1 },
]

export function BottomNav({ active, onTab }: { active: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          className={'nav-item' + (active === it.key ? ' active' : '')}
          onClick={() => onTab(it.key)}
        >
          <span className="ni-ico">{it.ico}</span>
          <span className="ni-label">{it.label}</span>
          {it.badge ? <span className="badge">{it.badge}</span> : null}
        </button>
      ))}
    </nav>
  )
}
