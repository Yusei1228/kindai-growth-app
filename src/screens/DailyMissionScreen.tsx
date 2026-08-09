import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { DAILY_REWARD } from '../data/dailyPool'
import type { Route } from '../App'
import type { Mission } from '../data/types'

export function DailyMissionScreen({ go }: { go: (r: Route) => void }) {
  const { state } = useApp()
  const done = state.missions.filter((m) => m.done).length
  const total = state.missions.length
  const allDone = done === total

  return (
    <>
      <PageHead title="今日のデイリーミッション" onBack={() => go({ name: 'home' })} />

      <div style={{ marginTop: 6 }}>
        <div className="row between">
          <span className="bold" style={{ fontSize: 13 }}>達成状況</span>
          <span className="bold" style={{ fontSize: 13 }}>{done}/{total}</span>
        </div>
        <div className="progress-track" style={{ marginTop: 6 }}>
          <i style={{ width: (done / total) * 100 + '%' }} />
        </div>
      </div>

      {state.missions.map((m) => (
        <MissionCard key={m.id} m={m} go={go} />
      ))}

      <div className="bonus-card">
        <div>
          <div className="bold">3つ達成でボーナス</div>
          <div className="muted" style={{ fontSize: 12 }}>ボーナス報酬: +50pt</div>
        </div>
        <div className="bonus-star" style={allDone ? { background: '#fef3c7', borderColor: '#fbbf24' } : undefined}>
          {allDone ? '⭐' : '☆'}
        </div>
      </div>
    </>
  )
}

function MissionCard({ m, go }: { m: Mission; go: (r: Route) => void }) {
  const active = {
    kind: 'daily' as const,
    missionId: m.id,
    timed: m.timed,
    title: m.title,
    category: m.category,
    targetMinutes: m.targetMinutes,
    rewardSp: DAILY_REWARD.sp,
    rewardExp: DAILY_REWARD.exp,
    statAmount: DAILY_REWARD.statAmount,
  }
  // 時間指定 → その時間ちょうどのタイマーへ / それ以外 → タイマー無しで感想入力へ
  const start = () => (m.timed ? go({ name: 'timer', mission: active }) : go({ name: 'review', mission: active, minutes: 0 }))

  return (
    <div className="mission-item">
      <div className="row between">
        <div>
          <h3>{m.title}</h3>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            {m.timed ? `所要時間: ${m.targetMinutes}分（タイマー）` : 'タイマー不要'}
          </div>
        </div>
        <span className={'status-tag ' + (m.done ? 'status-done' : 'status-todo')}>
          {m.done ? '完了' : '未完了'}
        </span>
      </div>

      <div className="reward-grid">
        <div><span className="k">EXP</span><span className="v">+{m.reward.exp}</span></div>
        <div><span className="k">シーズンPt</span><span className="v">+{m.reward.sp}</span></div>
        <div><span className="k">コイン</span><span className="v">+{m.reward.coins}</span></div>
        <div><span className="k">{m.reward.stat}</span><span className="v">+{m.reward.statAmount}</span></div>
      </div>

      <button className="btn-primary" disabled={m.done} onClick={start}>
        {m.done ? '達成済み' : m.timed ? 'チャレンジ' : '記録する'}
      </button>
    </div>
  )
}
