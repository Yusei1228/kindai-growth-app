import { useEffect, useRef, useState } from 'react'
import { PageHead } from '../components/ui'
import type { Route } from '../App'
import type { ActiveMission } from '../data/types'

const CAT_EMOJI: Record<string, string> = { 勉強: '📘', 運動: '🏃', 生活習慣: '⚡', 振り返り: '✨' }
const TARGETS = [0, 15, 30, 45, 60] // 分（0=なし/カウントアップ）

export function TimerScreen({ mission, go }: { mission: ActiveMission; go: (r: Route) => void }) {
  const [seconds, setSeconds] = useState(0) // 経過秒
  const [target, setTarget] = useState(mission.targetMinutes || 0) // 目標分（0=カウントアップ）
  const [running, setRunning] = useState(true)
  const ref = useRef<number | null>(null)
  const finishedRef = useRef(false)
  const [startAt] = useState(() => new Date())

  useEffect(() => {
    if (running) ref.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => { if (ref.current) window.clearInterval(ref.current) }
  }, [running])

  const countdown = target > 0
  const targetSec = target * 60
  const remaining = countdown ? Math.max(0, targetSec - seconds) : 0
  const pct = countdown ? Math.min(100, Math.round((seconds / targetSec) * 100)) : 0
  const emoji = mission.self?.emoji ?? CAT_EMOJI[mission.category] ?? '🎯'
  const back: Route = mission.kind === 'daily' ? { name: 'daily' } : { name: 'self' }
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const fmt = (t: number) => [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, '0')).join(':')

  const finish = (mins: number) => {
    if (finishedRef.current) return
    finishedRef.current = true
    setRunning(false)
    go({ name: 'review', mission, minutes: Math.max(1, mins) })
  }

  // カウントダウンが0になったら自動終了
  useEffect(() => {
    if (countdown && seconds >= targetSec) finish(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, countdown, targetSec])

  const onFinishTap = () => finish(countdown ? Math.min(target, Math.round(seconds / 60)) : Math.round(seconds / 60))

  return (
    <>
      <PageHead title="タイマー" onBack={() => go(back)} />
      <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
        {mission.kind === 'daily' ? 'デイリーミッション実行中' : 'セルフミッション実行中'}
      </div>

      {/* ミッション情報 */}
      <div className="section-card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <div className="tm-ico">{emoji}</div>
        <div>
          <div className="bold" style={{ fontSize: 15 }}>{mission.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>{mission.category}</div>
        </div>
      </div>

      {/* 目標時間セレクタはセルフミッションのみ（デイリーは指定時間で固定） */}
      {mission.kind === 'self' && (
        <>
          <div className="field-label" style={{ marginBottom: 6 }}>目標時間（押すとカウントダウン）</div>
          <div className="chip-row">
            {TARGETS.map((t) => (
              <button
                key={t}
                className={'time-chip' + (target === t ? ' active' : '')}
                onClick={() => { setTarget(t); finishedRef.current = false }}
              >
                {t === 0 ? 'なし' : `${t}分`}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 時間表示 */}
      <div className="section-card center" style={{ paddingTop: 18, paddingBottom: 18, marginTop: 12 }}>
        <div className="muted" style={{ fontSize: 13 }}>{countdown ? '残り時間' : '経過時間'}</div>
        <div className="tm-time">{fmt(countdown ? remaining : seconds)}</div>
        <div className="muted" style={{ fontSize: 12 }}>開始時刻 {hhmm(startAt)}</div>
        {countdown ? (
          <>
            <div className="progress-track" style={{ marginTop: 14 }}><i style={{ width: pct + '%' }} /></div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>進捗 {pct}%（{Math.floor(seconds / 60)}分 / {target}分）</div>
          </>
        ) : (
          <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>カウントアップ中（目標時間なし）</div>
        )}
      </div>

      {/* 操作 */}
      <div className="tm-btn-row">
        <button className="tm-btn tm-pause" onClick={() => setRunning((r) => !r)}>
          <span className="bold">{running ? '中断する' : '再開する'}</span>
          <span className="muted" style={{ fontSize: 11 }}>{running ? '一時停止します' : 'タイマーを続ける'}</span>
        </button>
        <button className="tm-btn tm-finish" onClick={onFinishTap} disabled={seconds === 0}>
          <span className="bold">終了する</span>
          <span style={{ fontSize: 11, opacity: 0.9 }}>ミッションを完了します</span>
        </button>
      </div>

      <div className="info-note" style={{ marginTop: 12 }}>
        ⓘ 長時間のご利用時には、定期的に確認画面が表示される場合があります。
      </div>
    </>
  )
}
