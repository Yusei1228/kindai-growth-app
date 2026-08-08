import { useApp } from '../store'
import { expForLevel } from '../data/types'
import { GemIcon, PointIcon } from '../components/ui'
import { HeroAvatar, MiniAvatar } from '../components/Avatar'
import { StatRing } from '../components/StatRing'
import type { Route } from '../App'

export function HomeScreen({ go, notify }: { go: (r: Route) => void; notify: (m: string) => void }) {
  const { state, claimDailyReward } = useApp()
  const u = state.user
  const need = expForLevel(u.level)
  const expPct = Math.min(100, Math.round((u.exp / need) * 100))
  const remaining = Math.max(0, need - u.exp)

  const stats = [
    { key: '体力', val: u.stats.体力, ico: '❤️', color: '#ec4899' },
    { key: '知力', val: u.stats.知力, ico: '📘', color: '#2563eb' },
    { key: '活力', val: u.stats.活力, ico: '⚡', color: '#f59e0b' },
    { key: '魅力', val: u.stats.魅力, ico: '✨', color: '#d946ef' },
  ]

  const claim = () => {
    if (u.dailyRewardAvailable) {
      claimDailyReward()
      notify('ログインボーナスを受け取りました！ スコア+50 / P+30')
    }
  }

  return (
    <>
      {/* 上部：コンパクトなプロフィールヘッダー（アイコン・レベル・連続・EXP・通貨を1枚に集約） */}
      <div className="home-header">
        <MiniAvatar />
        <div className="hh-main">
          <div className="hh-name-row">
            <span className="hh-name">{u.name}</span>
            <span className="lvl-tag">Lv.{u.level}</span>
          </div>
          <div className="hh-sub">
            <span className="streak-chip">🔥 連続{u.streak}日</span>
            <span className="muted" style={{ fontSize: 11 }}>あと {remaining.toLocaleString()} EXP</span>
          </div>
          <div className="exp-bar"><i style={{ width: expPct + '%' }} /></div>
        </div>
        <div className="hh-cur">
          <div className="pill hh-pill"><GemIcon /> {u.sp.toLocaleString()}</div>
          <div className="pill hh-pill"><PointIcon /> {u.points.toLocaleString()}</div>
        </div>
      </div>

      {/* ヒーローアバターカード（タップでアバター変更） */}
      <div style={{ position: 'relative' }}>
        <div className="hero-card" onClick={() => go({ name: 'avatar' })} style={{ cursor: 'pointer' }}>
          <HeroAvatar />
          <div className="hero-lvl">🛡️ Lv.{u.level}</div>
          <div className="avatar-edit-badge">🖉 タップで変更</div>
        </div>

        {/* 左：ログインボーナス */}
        <div className="reward-chest">
          <div className="chest-box" onClick={claim}>
            <div className="t">ログインボーナス</div>
            <div className="chest-emoji">{u.dailyRewardAvailable ? '🎁' : '✅'}</div>
            <div className={'chest-cta' + (u.dailyRewardAvailable ? '' : ' chest-claimed')}>
              {u.dailyRewardAvailable ? '受け取り可能!' : '受取済み'}
            </div>
          </div>
        </div>

        {/* 右：サイドボタン */}
        <div className="side-rail">
          <button className="rail-btn" onClick={() => notify('フレンド機能（一覧・招待）は近日公開')}>
            <span className="rail-ico" style={{ background: 'linear-gradient(135deg,#60a5fa,#2563eb)' }}>👥
              <span className="badge">1</span>
            </span>
            <span>フレンド</span>
          </button>
          <button className="rail-btn" onClick={() => go({ name: 'ranking' })}>
            <span className="rail-ico" style={{ background: 'linear-gradient(135deg,#f87171,#dc2626)' }}>🏛️
              <span className="badge">1</span>
            </span>
            <span>大学</span>
          </button>
          <button className="rail-btn" onClick={() => go({ name: 'rewards' })}>
            <span className="rail-ico" style={{ background: 'linear-gradient(135deg,#34d399,#059669)' }}>🎁
              <span className="badge">2</span>
            </span>
            <span>報酬</span>
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
