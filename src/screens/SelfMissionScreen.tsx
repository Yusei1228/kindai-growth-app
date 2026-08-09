import { PageHead } from '../components/ui'
import { SELF_MISSIONS } from '../data/selfMissions'
import type { ActiveMission, SelfMission, StatKey } from '../data/types'
import type { Route } from '../App'

const STAT_COLOR: Record<StatKey, string> = { 体力: '#ec4899', 知力: '#2563eb', 活力: '#f59e0b', 魅力: '#d946ef' }

export function SelfMissionScreen({ go }: { go: (r: Route) => void }) {
  const select = (m: SelfMission) => {
    const am: ActiveMission = {
      kind: 'self',
      self: m,
      title: m.title,
      category: m.category,
      targetMinutes: 0,
      rewardSp: 0,
      rewardExp: 0,
      statAmount: 0,
    }
    if (m.timed) go({ name: 'timer', mission: am })
    else go({ name: 'review', mission: am, minutes: 0 })
  }

  return (
    <>
      <PageHead title="ミッション選択" onBack={() => go({ name: 'home' })} />
      <p className="muted center" style={{ fontSize: 12, marginTop: 2 }}>取り組む内容を選んで、自分だけのミッションを始めよう</p>

      <div className="ms-grid">
        {SELF_MISSIONS.map((m) => (
          <button key={m.id} className="ms-card" onClick={() => select(m)}>
            <span className="ms-arrow">›</span>
            <div className="ms-title">{m.emoji} {m.title}</div>
            <div className="ms-rate">{m.timed ? '30分あたり' : '1回で'}</div>
            <div className="ms-reward">EXP: {m.exp30} / SP: {m.sp30}</div>
            <div className="ms-stats">
              {m.stats.map((s, i) => (
                <span key={s}>
                  {i > 0 && <span className="ms-dot-sep">・</span>}
                  <span className="ms-stat"><span className="ms-sq" style={{ background: STAT_COLOR[s] }} />{s}</span>
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="info-note" style={{ marginTop: 14 }}>
        ⓘ 取り組んだ時間に応じてEXPとシーズンポイントが獲得できます。
      </div>
    </>
  )
}
