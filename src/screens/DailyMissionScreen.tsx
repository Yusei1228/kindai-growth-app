import { PageHead } from '../components/ui'
import { DAILY_REWARD } from '../data/dailyPool'
import { TUTORIAL_MISSION_ID } from '../data/tutorial'
import { useApp } from '../store'
import type { Route } from '../App'
import type { Category, Mission } from '../data/types'

const CAT_META: Record<Category, { emoji: string; c1: string; c2: string; edge: string }> = {
  勉強: { emoji: '📘', c1: '#60a5fa', c2: '#2563eb', edge: '#1e40af' },
  運動: { emoji: '🏃', c1: '#fb7db3', c2: '#ec4899', edge: '#be185d' },
  生活習慣: { emoji: '⚡', c1: '#fcd34d', c2: '#f59e0b', edge: '#b45309' },
  振り返り: { emoji: '✨', c1: '#e879f9', c2: '#d946ef', edge: '#a21caf' },
}

export function DailyMissionScreen({ go, back, onBeginTutorial }: { go: (r: Route) => void; back: () => void; onBeginTutorial: () => void }) {
  const { state } = useApp()
  const tutMission = state.missions.find((m) => m.id === TUTORIAL_MISSION_ID)
  const dailyMissions = state.missions.filter((m) => m.id !== TUTORIAL_MISSION_ID)
  const done = dailyMissions.filter((m) => m.done).length
  const total = dailyMissions.length || 1
  const allDone = done === dailyMissions.length && dailyMissions.length > 0
  const showTutorial = !state.user.tutorialDone && !!tutMission

  return (
    <>
      <PageHead title="今日のデイリーミッション" onBack={back} />

      {/* ボーナス（上部・目立つ位置） */}
      <div className={'dm-bonus dm-bonus-top' + (allDone ? ' done' : '')}>
        <div className="dm-bonus-ico">{allDone ? '🎉' : '🎁'}</div>
        <div style={{ flex: 1 }}>
          <div className="bold" style={{ fontSize: 15 }}>デイリー3つ達成でボーナス</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {allDone ? 'ボーナス獲得！ スコア +50' : `あと ${dailyMissions.length - done} つでボーナス スコア +50`}
          </div>
        </div>
        <div className="dm-bonus-amount">+50</div>
      </div>

      {/* 進捗（デイリー3件のみ） */}
      <div className="dm-progress">
        <div className="row between">
          <span className="bold" style={{ fontSize: 13 }}>達成状況</span>
          <span className="bold" style={{ fontSize: 13 }}>{done} / {dailyMissions.length}</span>
        </div>
        <div className="progress-track" style={{ marginTop: 8 }}>
          <i style={{ width: (done / total) * 100 + '%' }} />
        </div>
      </div>

      {/* 初回：チュートリアルの導線（固定ミッション） */}
      {showTutorial && (
        <>
          <div className="onboard-hint">👇 まずはこれをタップ！アプリの使い方がわかります</div>
          <MissionCard m={tutMission!} go={go} onBeginTutorial={onBeginTutorial} onboard={!tutMission!.done} />
        </>
      )}

      {/* デイリーミッション3件 */}
      {dailyMissions.map((m) => (
        <MissionCard key={m.id} m={m} go={go} onBeginTutorial={onBeginTutorial} />
      ))}
    </>
  )
}

function MissionCard({ m, go, onBeginTutorial, onboard }: { m: Mission; go: (r: Route) => void; onBeginTutorial: () => void; onboard?: boolean }) {
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
  const isTut = m.id === TUTORIAL_MISSION_ID
  const start = () =>
    isTut
      ? onBeginTutorial()
      : m.timed
        ? go({ name: 'timer', mission: active })
        : go({ name: 'review', mission: active, minutes: 0 })
  const styleVars = isTut
    ? { ['--c1' as string]: '#7db4ff', ['--c2' as string]: '#2563eb', ['--edge' as string]: '#1e40af' }
    : { ['--c1' as string]: meta.c1, ['--c2' as string]: meta.c2, ['--edge' as string]: meta.edge }

  return (
    <div className={'dm-card' + (isTut ? ' dm-tut' : '') + (onboard ? ' onboard-pulse' : '')} style={styleVars}>
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
