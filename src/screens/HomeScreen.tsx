import { useApp } from '../store'
import { expForLevel } from '../data/types'
import { GemIcon, PointIcon } from '../components/ui'
import { HeroAvatar } from '../components/Avatar'
import { StatRing } from '../components/StatRing'
import type { Route } from '../App'

export function HomeScreen({ go, notify }: { go: (r: Route) => void; notify: (m: string) => void }) {
  const { state, loginBonusAvailable } = useApp()
  const u = state.user
  const loginBonus = state.loginBonus
  const need = expForLevel(u.level)
  const expPct = Math.min(100, Math.round((u.exp / need) * 100))
  const remaining = Math.max(0, need - u.exp)

  const stats = [
    { key: '体力', val: u.stats.体力, ico: '❤️', c1: '#f9a8d4', c2: '#ec4899' },
    { key: '知力', val: u.stats.知力, ico: '📘', c1: '#93c5fd', c2: '#2563eb' },
    { key: '活力', val: u.stats.活力, ico: '⚡', c1: '#fcd34d', c2: '#f59e0b' },
    { key: '魅力', val: u.stats.魅力, ico: '✨', c1: '#f0abfc', c2: '#d946ef' },
  ]

  return (
    <>
      {/* 上部：透明（グラス）プロフィールヘッダー */}
      <div className="home-header" data-tour="profile">
        <div className="hh-main">
          <div className="hh-name-row">
            <span className="hh-name">{u.name}</span>
            <span className="lvl-tag">Lv.{u.level}</span>
          </div>
          <div className="hh-sub">
            <span className="streak-chip">🔥 連続{u.streak}日</span>
            <span className="hh-exp-txt">あと {remaining.toLocaleString()} EXP</span>
          </div>
          <div className="exp-bar" data-tour="exp"><i style={{ width: expPct + '%' }} /></div>
        </div>
        <div className="hh-cur">
          <button className="pill hh-pill" data-tour="sp" onClick={() => notify('ミッション達成でスコアが増えます')}>
            <GemIcon /> {u.sp.toLocaleString()} <span className="hh-plus" style={{ background: 'var(--blue-500)' }}>＋</span>
          </button>
          <button className="pill hh-pill" onClick={() => notify('ミッション達成でポイントが増えます')}>
            <PointIcon /> {u.points.toLocaleString()} <span className="hh-plus" style={{ background: 'var(--green-500)' }}>＋</span>
          </button>
        </div>
      </div>

      {/* ヒーローアバターカード（タップでアバター変更） */}
      <div className="hero-wrap" style={{ position: 'relative' }}>
        <div className="hero-stack">
          <span className="hero-back hero-back1" aria-hidden="true" />
          <div className="hero-card" onClick={() => go({ name: 'avatar' })} style={{ cursor: 'pointer' }}>
            <HeroAvatar />
            <div className="hero-lvl">🛡️ Lv.{u.level}</div>
            <div className="avatar-edit-badge">🖉 タップで変更</div>
          </div>
        </div>

        {/* 左：ログインボーナス（宝箱・受け取り導線） */}
        <div className="reward-chest" data-tour="loginbonus">
          <button className="chest-box" onClick={() => go({ name: 'login-bonus' })}>
            <div className="t">ログインボーナス</div>
            <ChestIcon open={loginBonusAvailable} />
            <div className="chest-prog">{loginBonusAvailable ? '受け取れる！' : `${loginBonus.claimedDays}/30`}</div>
            {loginBonusAvailable && <span className="chest-badge">!</span>}
          </button>
        </div>

        {/* 右：サイドボタン（高品質・光沢＋立体） */}
        <div className="side-rail">
          <button className="rail-btn" onClick={() => notify('フレンド機能（一覧・招待）は近日公開')}>
            <span className="rail-ico rail-blue"><IconFriends /><span className="badge">1</span></span>
            <span className="rail-label">フレンド</span>
          </button>
          <button className="rail-btn" onClick={() => go({ name: 'ranking' })}>
            <span className="rail-ico rail-red"><IconUniv /><span className="badge">1</span></span>
            <span className="rail-label">大学</span>
          </button>
          <button className="rail-btn" onClick={() => go({ name: 'rewards' })}>
            <span className="rail-ico rail-green"><IconGift /><span className="badge">2</span></span>
            <span className="rail-label">報酬</span>
          </button>
        </div>
      </div>

      {/* ステータス4種（枠なしリングゲージ・視覚重視でコンパクト） */}
      <div className="stats-ring-row" data-tour="stats">
        {stats.map((s) => (
          <StatRing key={s.key} label={s.key} value={s.val} emoji={s.ico} c1={s.c1} c2={s.c2} />
        ))}
      </div>

      {/* ミッションCTA */}
      <div className="mission-cta-row" data-tour="missions">
        <button className="mission-cta cta-blue" onClick={() => go({ name: 'daily' })}>
          <div className="ttl">📋 デイリーミッション</div>
          <div className="sub">今日のやることを確認</div>
          <div className="arrow">›</div>
        </button>
        <button className="mission-cta cta-green" onClick={() => go({ name: 'self' })}>
          <div className="ttl">🎯 セルフミッション</div>
          <div className="sub">自分の目標に挑戦</div>
          <div className="arrow">›</div>
        </button>
      </div>

      {/* ランキング導線バナー */}
      <button className="event-banner" onClick={() => go({ name: 'ranking' })} style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' }}>
        <div className="event-tag">🏆 検証キャンペーン実施中</div>
        <div className="event-ttl">努力を記録してランキングへ</div>
        <div className="event-sub">デイリー＋セルフでスコアを貯めて上位を目指そう</div>
        <div className="event-left">順位を見る ›</div>
      </button>
    </>
  )
}

// 右サイドボタン用の白アイコン
function IconFriends() {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" className="rail-glyph" aria-hidden="true">
      {/* 後ろの人（右・小さめ） */}
      <circle cx="15.6" cy="9" r="2.7" />
      <path d="M10.6 19v-.7c0-3 2.1-4.9 4.9-4.9 2.6 0 4.7 1.8 4.9 4.6V19z" />
      {/* 前の人（左・大きめ） */}
      <circle cx="9" cy="8.2" r="3.2" />
      <path d="M2.7 19.4v-.9c0-3.3 2.6-5.3 6.3-5.3s6.3 2 6.3 5.3v.9z" />
    </svg>
  )
}
function IconUniv() {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" className="rail-glyph" aria-hidden="true">
      {/* 屋根の上の旗 */}
      <rect x="11.6" y="1.2" width="0.9" height="4.8" rx="0.4" />
      <path d="M12.5 1.5 L16.6 2.8 L12.5 4.1 Z" />
      {/* 神殿風の建物（破風・柱・基壇） */}
      <path d="M12 4.4 L20.6 8.8 L3.4 8.8 Z" />
      <rect x="4.2" y="9.2" width="15.6" height="1.8" rx="0.3" />
      <rect x="5.3" y="11.3" width="2" height="6" />
      <rect x="8.8" y="11.3" width="2" height="6" />
      <rect x="13.2" y="11.3" width="2" height="6" />
      <rect x="16.7" y="11.3" width="2" height="6" />
      <rect x="3.4" y="17.5" width="17.2" height="2.2" rx="0.5" />
    </svg>
  )
}
function IconGift() {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" className="rail-glyph" aria-hidden="true">
      {/* フタ（左右2分割で中央にリボンの隙間） */}
      <rect x="3" y="8.4" width="8.1" height="3.4" rx="0.8" />
      <rect x="12.9" y="8.4" width="8.1" height="3.4" rx="0.8" />
      {/* 箱（左右2分割＝縦リボンが背景色で透ける） */}
      <rect x="4.5" y="12" width="6.6" height="8.4" rx="0.9" />
      <rect x="12.9" y="12" width="6.6" height="8.4" rx="0.9" />
      {/* 蝶結び */}
      <path d="M11.5 8.1 C9.9 5.1 5.7 5.7 6.3 7.7 C6.7 9.1 9.3 9 11.5 8.1 Z" />
      <path d="M12.5 8.1 C14.1 5.1 18.3 5.7 17.7 7.7 C17.3 9.1 14.7 9 12.5 8.1 Z" />
    </svg>
  )
}

// 宝箱アイコン（デイリーボーナス用）
function ChestIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 48 42" className="chest-svg" role="img" aria-label="宝箱">
      <defs>
        <linearGradient id="chestBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6c04a" />
          <stop offset="1" stopColor="#d98a24" />
        </linearGradient>
        <linearGradient id="chestLid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd873" />
          <stop offset="1" stopColor="#f2b03c" />
        </linearGradient>
      </defs>
      {open && <circle cx="24" cy="8" r="5" fill="#fff3b0" opacity="0.9" />}
      {/* 本体 */}
      <rect x="6" y="18" width="36" height="20" rx="4" fill="url(#chestBody)" stroke="#a9691a" strokeWidth="1.5" />
      {/* フタ */}
      <path d={open ? 'M6 18 Q24 -2 42 18 L42 12 Q24 -6 6 12 Z' : 'M6 18 Q24 4 42 18 L42 20 L6 20 Z'} fill="url(#chestLid)" stroke="#a9691a" strokeWidth="1.5" />
      {/* 金具バンド */}
      <rect x="21" y={open ? 8 : 12} width="6" height="26" fill="#b9791f" opacity="0.85" />
      {/* 錠前 */}
      <rect x="21" y="24" width="6" height="8" rx="1.5" fill="#7a4e12" />
      <circle cx="24" cy="26.5" r="2.1" fill="#ffe9a8" />
    </svg>
  )
}
