import { useEffect, useRef, useState } from 'react'
import { PageHead } from '../components/ui'
import type { Route } from '../App'
import type { ActiveMission } from '../data/types'

export function TimerScreen({ mission, go }: { mission: ActiveMission; go: (r: Route) => void }) {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef<number | null>(null)

  useEffect(() => {
    if (running) {
      ref.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    }
    return () => {
      if (ref.current) window.clearInterval(ref.current)
    }
  }, [running])

  const fmt = (t: number) => {
    const h = String(Math.floor(t / 3600)).padStart(2, '0')
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0')
    const s = String(t % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  const targetSec = mission.targetMinutes * 60
  const pct = Math.min(100, (seconds / targetSec) * 100)
  const back: Route = mission.kind === 'daily' ? { name: 'daily' } : { name: 'self' }

  const finish = () => {
    setRunning(false)
    const minutes = Math.max(1, Math.round(seconds / 60))
    go({ name: 'review', mission, minutes })
  }

  return (
    <>
      <PageHead title="ミッション実行中" onBack={() => go(back)} action={<span className="back" style={{ visibility: 'hidden' }} />} />

      <div className="timer-card">
        <h3 style={{ margin: '0 0 8px' }}>{mission.title}</h3>
        <div className="muted" style={{ fontSize: 13 }}>カテゴリー: {mission.category}</div>
        <div className="muted" style={{ fontSize: 13 }}>目標時間: {mission.targetMinutes}分</div>
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 10, fontSize: 12, color: 'var(--ink-soft)' }}>
          報酬: スコア +{mission.rewardSp} / EXP +{mission.rewardExp} / ステータス +{mission.statAmount}
        </div>
      </div>

      <div className="center muted" style={{ marginTop: 18, fontSize: 13 }}>経過時間</div>
      <div className="timer-circle" style={{ ['--p' as string]: pct + '%' }}>
        <div className="timer-inner">{fmt(seconds)}</div>
      </div>

      <div className="center muted" style={{ fontSize: 12 }}>終了後にレビューを記録するとスコアに反映されます</div>

      <div className="note-box">
        長時間実行時は確認通知が表示されます<br />
        反応がない場合はタイマーが終了する場合があります
      </div>

      <button className="btn-primary" onClick={finish} disabled={seconds === 0}>終了してレビューを書く</button>
      <div className="row gap12" style={{ marginTop: 10 }}>
        <button className="btn-ghost" onClick={() => setRunning((r) => !r)}>{running ? '一時停止' : 'スタート'}</button>
        <button className="btn-ghost" onClick={() => { setRunning(false); setSeconds(0) }}>リセット</button>
      </div>
      <p className="hint center">※ デモでは経過秒数を分に換算して記録します</p>
    </>
  )
}
