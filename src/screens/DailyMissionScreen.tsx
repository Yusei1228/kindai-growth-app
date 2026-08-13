import { PageHead } from '../components/ui'
import { DAILY_REWARD } from '../data/dailyPool'
import { useApp } from '../store'
import type { Route } from '../App'
import type { Category, Mission } from '../data/types'

const CAT_META: Record<Category, { emoji: string; c1: string; c2: string; edge: string }> = {
  勉強: { emoji: '📘', c1: '#60a5fa', c2: '#2563eb', edge: '#1e40af' },
  運動: { emoji: '🏃', c1: '#fb7db3', c2: '#ec4899', edge: '#be185d' },
  生活習慣: { emoji: '⚡', c1: '#fcd34d', c2: '#f59e0b', edge: '#b45309' },
  振り返り: { emoji: '✨', c1: '#e879f9', c2: '#d946ef', edge: '#a21caf' },
}

export function DailyMissionScreen({ go, back }: { go: (r: Route) => void; back: () => void }) {
  const { state } = useApp()
  const done = state.missions.filter((m) => m.done).length
  const total = state.missions.length || 1
  const allDone = done === state.missions.length

  return (
    <>
      <PageHead title="今日のデイリーミッション" onBack={back} />

      {/* 進捗 */}
      <div className="dm-progress">
        <div className="row between">
          <span className="bold" style={{ fontSize: 13 }}>達成状況</span>
          <span className="bold" style={{ fontSize: 13 }}>{done} / {state.missions.length}</span>
        </div>
        <div className="progress-track" style={{ marginTop: 8 }}>
          <i style={{ width: (done / total) * 100 + '%' }} />
        </div>
      </div>

      {state.missions.map((m) => (
        <MissionCard key={m.id} m={m} go={go} />
      ))}

      {/* ボーナス */}
      <div className={'dm-bonus' + (allDone ? ' done' : '')}>
        <div className="dm-bonus-ico">{allDone ? '🎉' : '🎁'}</div>
        <div style={{ flex: 1 }}>
          <div className="bold">3つ達成でボーナス</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {allDone ? 'ボーナス獲得！ スコア +50' : `あと ${state.missions.length - done} つでボーナス +50`}
          </div>
        </div>
        <div className="dm-bonus-star">{allDone ? '⭐' : '☆'}</div>
      </div>
    </>
  )
}

function MissionCard({ m, go }: { m: Mission; go: (r: Route) => void }) {
  const meta = CAT_META[m.category]
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
  const isTut = m.id === 'tutorial'
  const start = () =>
    isTut
      ? go({ name: 'tutorial' })
      : m.timed
        ? go({ name: 'timer', mission: active })
        : go({ name: 'review', mission: active, minutes: 0 })
  const styleVars = isTut
    ? { ['--c1' as string]: '#7db4ff', ['--c2' as string]: '#2563eb', ['--edge' as string]: '#1e40af' }
    : { ['--c1' as string]: meta.c1, ['--c2' as string]: meta.c2, ['--edge' as string]: meta.edge }

  return (
    <div className={'dm-card' + (isTut ? ' dm-tut' : '')} style={styleVars}>
      <div className="dm-top">
        <div className="dm-ico">{isTut ? '🎓' : meta.emoji}</div>
        <div className="dm-main">
          <h3 className="dm-title">{isTut && <span className="dm-tut-badge">はじめに</span>}{m.title}</h3>
          <div className="dm-sub">{isTut ? '使い方を覚えよう ・ 約1分' : `${m.timed ? `${m.targetMinutes}分 タイマー` : 'タイマー不要'} ・ ${m.category}`}</div>
        </div>
        <span className={'dm-status ' + (m.done ? 'done' : 'todo')}>{m.done ? '完了' : '未達成'}</span>
      </div>

      <div className="dm-rewards">
        <span className="dm-rw">EXP +{m.reward.exp}</span>
        <span className="dm-rw">スコア +{m.reward.sp}</span>
        <span className="dm-rw">{isTut ? '全ステ' : m.reward.stat} +{m.reward.statAmount}</span>
        {isTut && <span className="dm-rw tut">Lv.UP</span>}
      </div>

      <button className="dm-btn" disabled={m.done} onClick={start} data-sound={isTut ? 'none' : undefined}>
        {m.done ? '達成済み' : isTut ? 'はじめる' : m.timed ? 'チャレンジする' : '記録する'}<span className="dm-arrow"> ›</span>
      </button>
    </div>
  )
}
