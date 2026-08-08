import { useApp } from '../store'
import { expForLevel } from '../data/types'
import { GemIcon, PointIcon } from '../components/ui'
import { HeroAvatar, MiniAvatar } from '../components/Avatar'
import { StatRing } from '../components/StatRing'
import type { Route } from '../App'

export function HomeScreen({ go, notify }: { go: (r: Route) => void; notify: (m: string) => void }) {
  const { state } = useApp()
  const u = state.user
  const need = expForLevel(u.level)
  const expPct = Math.min(100, Math.round((u.exp / need) * 100))
  const remaining = Math.max(0, need - u.exp)
  const dailyDone = state.missions.filter((m) => m.done).length // デイリーボーナス進捗 X/3

  const stats = [
    { key: '体力', val: u.stats.体力, ico: '❤️', color: '#ec4899' },
    { key: '知力', val: u.stats.知力, ico: '📘', color: '#2563eb' },
    { key: '活力', val: u.stats.活力, ico: '⚡', color: '#f59e0b' },
    { key: '魅力', val: u.stats.魅力, ico: '✨', color: '#d946ef' },
  ]

  return (
    <>
      {/* 上部：透明（グラス）プロフィールヘッダー */}
      <div className="home-header">
        <div className="hh-avatar"><MiniAvatar /></div>
        <div className="hh-main">
          <div className="hh-name-row">
            <span className="hh-name">{u.name}</span>
            <span className="lvl-tag">Lv.{u.level}</span>
          </div>
          <div className="hh-sub">
            <span className="streak-chip">🔥 連続{u.streak}日</span>
            <span className="hh-exp-txt">あと {remaining.toLocaleString()} EXP</span>
          </div>
          <div className="exp-bar"><i style={{ width: expPct + '%' }} /></div>
        </div>
        <div className="hh-cur">
          <button className="pill hh-pill" onClick={() => notify('ミッション達成でスコアが増えます')}>
            <GemIcon /> {u.sp.toLocaleString()} <span className="hh-plus" style={{ background: 'var(--blue-500)' }}>＋</span>
          </button>
          <button className="pill hh-pill" onClick={() => notify('ミッション達成でポイントが増えます')}>
            <PointIcon /> {u.points.toLocaleString()} <span className="hh-plus" style={{ background: 'var(--green-500)' }}>＋</span>
          </button>
        </div>
      </div>

      {/* ヒーローアバターカード（タップでアバター変更） */}
      <div style={{ position: 'relative' }}>
        <div className="hero-card" onClick={() => go({ name: 'avatar' })} style={{ cursor: 'pointer' }}>
          <HeroAvatar />
          <div className="hero-lvl">🛡️ Lv.{u.level}</div>
          <div className="avatar-edit-badge">🖉 タップで変更</div>
        </div>

        {/* 左：デイリーボーナス（宝箱・進捗X/3） */}
        <div className="reward-chest">
          <button className="chest-box" onClick={() => go({ name: 'daily' })}>
            <div className="t">デイリーボーナス</div>
            <ChestIcon open={dailyDone >= 3} />
            <div className="chest-prog">{dailyDone}/3</div>
          </button>
        </div>

        {/* 右：サイドボタン（高品質・光沢＋立体） */}
        <div className="side-rail">
          <button className="rail-btn" onClick={() => notify('フレンド機能（一覧・招待）は近日公開')}>
            <span className="rail-ico rail-blue">👥<span className="badge">1</span></span>
            <span className="rail-label">フレンド</span>
          </button>
          <button className="rail-btn" onClick={() => go({ name: 'ranking' })}>
            <span className="rail-ico rail-red">🏛️<span className="badge">1</span></span>
            <span className="rail-label">大学</span>
          </button>
          <button className="rail-btn" onClick={() => go({ name: 'rewards' })}>
            <span className="rail-ico rail-green">🎁<span className="badge">2</span></span>
            <span className="rail-label">報酬</span>
          </button>
        </div>
      </div>

      {/* ステータス4種（枠なしリングゲージ・視覚重視でコンパクト） */}
      <div className="stats-ring-row">
        {stats.map((s) => (
          <StatRing key={s.key} label={s.key} value={s.val} emoji={s.ico} color={s.color} />
        ))}
      </div>

      {/* ミッションCTA */}
      <div className="mission-cta-row">
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
