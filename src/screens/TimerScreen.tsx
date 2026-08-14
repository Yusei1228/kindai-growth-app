import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHead } from '../components/ui'
import type { Route } from '../App'
import type { ActiveMission } from '../data/types'
import { loadTimerSession, saveTimerSession, clearTimerSession, elapsedFrom } from '../lib/timerSession'
import { isBgmEnabled, setBgmEnabled, startBgm, stopBgm } from '../lib/sound'
import { ENCOURAGEMENTS } from '../data/encouragements'

const CAT_EMOJI: Record<string, string> = { 勉強: '📘', 運動: '🏃', 生活習慣: '⚡', 振り返り: '✨' }
const TARGETS = [0, 15, 30, 45, 60] // 分（0=なし/カウントアップ）
const QUOTE_INTERVAL = 15000 // 応援メッセージの切替間隔（ms）

/** Fisher–Yates シャッフル（毎回新鮮な応援順にする） */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TimerScreen({ mission, back, replace }: { mission: ActiveMission; back: () => void; replace: (r: Route) => void }) {
  // 既存セッションがあれば復元（アプリを閉じても再開できるように）
  const restored = useRef(loadTimerSession()).current
  const resuming = !!restored

  const [target, setTarget] = useState(() => (restored ? restored.target : mission.targetMinutes || 0))
  const [accumulated, setAccumulated] = useState(() => (restored ? restored.accumulated : 0))
  const [segmentStart, setSegmentStart] = useState<number | null>(() =>
    restored ? restored.segmentStart : Date.now(),
  )
  const [now, setNow] = useState(() => Date.now())
  const originStartRef = useRef<number>(restored ? restored.originStart : Date.now())
  const finishedRef = useRef(false)
  const [confirmBack, setConfirmBack] = useState(false)

  // BGM ON/OFF（タイマー画面から直接切替）
  const [bgmOn, setBgmOn] = useState(isBgmEnabled())
  const toggleBgm = () => {
    const next = !bgmOn
    setBgmEnabled(next)
    setBgmOn(next)
    if (next) startBgm()
    else stopBgm()
  }

  // 応援メッセージ：毎回シャッフルし、一定間隔＆タップで新しいメッセージに切替
  const quotes = useMemo(() => shuffled(ENCOURAGEMENTS), [])
  const [qi, setQi] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setQi((i) => (i + 1) % quotes.length), QUOTE_INTERVAL)
    return () => window.clearInterval(id)
  }, [quotes.length])
  const quote = quotes[qi]
  const nextQuote = () => setQi((i) => (i + 1) % quotes.length)

  const running = segmentStart != null
  const seconds = elapsedFrom({ accumulated, segmentStart }, now)

  const countdown = target > 0
  const targetSec = target * 60
  const remaining = countdown ? Math.max(0, targetSec - seconds) : 0
  const pct = countdown ? Math.min(100, Math.round((seconds / targetSec) * 100)) : 0
  const emoji = mission.self?.emoji ?? CAT_EMOJI[mission.category] ?? '🎯'
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const fmt = (t: number) => [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, '0')).join(':')

  // 実時間で再描画（1秒ごと）＋ タブ復帰時に即時反映（バックグラウンド対策）
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    const onVis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [running])

  // 状態が変わるたびにセッションを保存（閉じても復元できるように）
  useEffect(() => {
    if (finishedRef.current) return
    saveTimerSession({
      mission,
      target,
      originStart: originStartRef.current,
      segmentStart,
      accumulated,
      updatedAt: Date.now(),
    })
  }, [mission, target, segmentStart, accumulated])

  const finish = (mins: number) => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearTimerSession()
    replace({ name: 'review', mission, minutes: Math.max(1, mins), startedAtMs: originStartRef.current })
  }

  // カウントダウンが目標に到達したら自動終了（アプリを閉じている間に超過していても復帰時に完了）
  useEffect(() => {
    if (countdown && seconds >= targetSec) finish(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, countdown, targetSec])

  const pause = () => {
    // 現区間の経過を積み上げてから停止
    setAccumulated((a) => a + (segmentStart != null ? Math.max(0, Math.floor((Date.now() - segmentStart) / 1000)) : 0))
    setSegmentStart(null)
  }
  const resume = () => {
    setSegmentStart(Date.now())
    setNow(Date.now())
  }
  const toggleRun = () => (running ? pause() : resume())

  const changeTarget = (t: number) => {
    setTarget(t)
    finishedRef.current = false
  }

  const onFinishTap = () => finish(countdown ? Math.min(target, Math.round(seconds / 60)) : Math.round(seconds / 60))

  // 戻る操作：計測が進んでいれば確認を挟む（誤タップ防止）
  const requestBack = () => {
    if (!finishedRef.current && seconds > 0) setConfirmBack(true)
    else {
      clearTimerSession()
      back()
    }
  }
  const confirmLeave = () => {
    clearTimerSession()
    setConfirmBack(false)
    back()
  }

  return (
    <>
      <PageHead title="タイマー" onBack={requestBack} />
      <div className="tm-subrow">
        <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
          {mission.kind === 'daily' ? 'デイリーミッション実行中' : 'セルフミッション実行中'}
          {resuming && <span className="tm-resume-tag">前回の続きから再開</span>}
        </div>
        <button
          className={'tm-bgm' + (bgmOn ? ' on' : '')}
          onClick={toggleBgm}
          role="switch"
          aria-checked={bgmOn}
          aria-label="BGMのオン・オフ"
          data-sound="none"
        >
          🎵 BGM {bgmOn ? 'ON' : 'OFF'}
        </button>
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
                onClick={() => changeTarget(t)}
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
        <div className="muted" style={{ fontSize: 12 }}>開始時刻 {hhmm(new Date(originStartRef.current))}</div>
        {!running && !finishedRef.current && <div className="tm-paused-tag">一時停止中</div>}
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
        <button className="tm-btn tm-pause" onClick={toggleRun}>
          <span className="bold">{running ? '中断する' : '再開する'}</span>
          <span className="muted" style={{ fontSize: 11 }}>{running ? '一時停止します' : 'タイマーを続ける'}</span>
        </button>
        <button className="tm-btn tm-finish" onClick={onFinishTap} disabled={seconds === 0}>
          <span className="bold">終了する</span>
          <span style={{ fontSize: 11, opacity: 0.9 }}>ミッションを完了します</span>
        </button>
      </div>

      {/* 応援メッセージ（タップで次へ・自動でも切替。毎回シャッフルで新鮮に） */}
      <button className="tm-quote" data-tag={quote.tag} onClick={nextQuote} data-sound="none" aria-label="次の応援メッセージ">
        <span className="tm-quote-tag">{quote.tag}</span>
        <div className="tm-quote-in" key={qi}>
          <span className="tm-quote-emoji">{quote.emoji}</span>
          <span className="tm-quote-text">{quote.text}</span>
        </div>
        <span className="tm-quote-hint">タップで次のメッセージ ›</span>
      </button>

      <div className="info-note" style={{ marginTop: 12 }}>
        ⓘ タイマーはバックグラウンドや画面を閉じても計測が続きます。アプリを開き直すとこの続きから再開できます。
      </div>

      {/* 戻る確認ダイアログ（誤タップ防止） */}
      {confirmBack && (
        <div className="overlay" onClick={() => setConfirmBack(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-ico">⚠️</div>
            <h3 className="confirm-title">タイマーが動作中です</h3>
            <p className="confirm-msg">
              戻ると計測中のミッションが中断され、この記録は保存されません。よろしいですか？
            </p>
            <div className="confirm-btn-row">
              <button className="confirm-stay" onClick={() => setConfirmBack(false)}>タイマーを続ける</button>
              <button className="confirm-leave" onClick={confirmLeave}>中断して戻る</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
