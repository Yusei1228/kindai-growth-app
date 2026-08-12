import { useState } from 'react'
import { useApp } from '../store'
import { PageHead, GemIcon, PointIcon } from '../components/ui'
import { HeroAvatar } from '../components/Avatar'
import { expForLevel } from '../data/types'
import { isSoundEnabled, setSoundEnabled, playSound, isBgmEnabled, setBgmEnabled, startBgm, stopBgm } from '../lib/sound'
import type { Route } from '../App'

export function MyPageScreen({ go }: { go: (r: Route) => void }) {
  const { state, reset } = useApp()
  const u = state.user
  const [soundOn, setSoundOn] = useState(isSoundEnabled())
  const [bgmOn, setBgmOn] = useState(isBgmEnabled())
  const toggleSound = () => {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)
    if (next) playSound('tap') // ONにした確認音
  }
  const toggleBgm = () => {
    const next = !bgmOn
    setBgmEnabled(next)
    setBgmOn(next)
    if (next) startBgm()
    else stopBgm()
  }
  const expPct = Math.min(100, Math.round((u.exp / expForLevel(u.level)) * 100))

  const stats = [
    { key: '体力', val: u.stats.体力, cls: 'ico-tairyoku', ico: '❤️' },
    { key: '知力', val: u.stats.知力, cls: 'ico-chiryoku', ico: '📘' },
    { key: '活力', val: u.stats.活力, cls: 'ico-katsuryoku', ico: '⚡' },
    { key: '魅力', val: u.stats.魅力, cls: 'ico-miryoku', ico: '✨' },
  ]
  const power = u.stats.体力 + u.stats.知力 + u.stats.活力 + u.stats.魅力

  return (
    <>
      <PageHead title="マイページ" />

      <div className="section-card center">
        <div style={{ width: 150, margin: '0 auto', borderRadius: 14, overflow: 'hidden' }}>
          <HeroAvatar />
        </div>
        <div className="bold" style={{ fontSize: 22, marginTop: 10 }}>{u.name}</div>
        <span className="lvl-tag" style={{ fontSize: 14 }}>Lv.{u.level}</span>
        <div className="exp-bar" style={{ marginTop: 10 }}><i style={{ width: expPct + '%' }} /></div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>EXP {u.exp} / {expForLevel(u.level)}・総合力 {power}</div>

        <div className="row gap12" style={{ justifyContent: 'center', marginTop: 14 }}>
          <div className="pill"><GemIcon /> {u.sp.toLocaleString()}</div>
          <div className="pill"><PointIcon /> {u.points.toLocaleString()}</div>
          <div className="pill">🔥 {u.streak}日</div>
        </div>
      </div>

      <div className="section-title">ステータス</div>
      <div className="section-card">
        {stats.map((s) => (
          <div key={s.key} style={{ marginBottom: 14 }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <span className="row gap6"><span className={'ico ' + s.cls} style={{ width: 26, height: 26, fontSize: 13 }}>{s.ico}</span><span className="bold" style={{ fontSize: 14 }}>{s.key}</span></span>
              <span className="bold">{s.val}<span className="muted" style={{ fontSize: 11 }}> /100</span></span>
            </div>
            <div className="progress-track"><i style={{ width: s.val + '%' }} /></div>
          </div>
        ))}
      </div>

      <div className="section-title">記録サマリ</div>
      <div className="kpi-grid">
        <div className="kpi"><div className="lab">累計達成日数</div><div className="num">{u.totalDays}<span style={{ fontSize: 14 }}> 日</span></div></div>
        <div className="kpi"><div className="lab">総記録回数</div><div className="num">{state.logs.length}<span style={{ fontSize: 14 }}> 回</span></div></div>
      </div>

      <div className="section-title">設定</div>
      <button className="sound-toggle" onClick={toggleSound} role="switch" aria-checked={soundOn} data-sound="none">
        <span className="st-label">🔊 効果音</span>
        <span className={'st-switch' + (soundOn ? ' on' : '')}><span className="st-knob" /></span>
        <span className="st-state">{soundOn ? 'ON' : 'OFF'}</span>
      </button>
      <button className="sound-toggle" style={{ marginTop: 10 }} onClick={toggleBgm} role="switch" aria-checked={bgmOn} data-sound="none">
        <span className="st-label">🎵 BGM</span>
        <span className={'st-switch' + (bgmOn ? ' on' : '')}><span className="st-knob" /></span>
        <span className="st-state">{bgmOn ? 'ON' : 'OFF'}</span>
      </button>

      <button className="btn-ghost" style={{ marginTop: 14 }} onClick={() => go({ name: 'rewards' })}>🎁 協賛店舗・クーポンを見る</button>
      <button className="btn-ghost" style={{ marginTop: 10, color: '#ef4444' }} onClick={() => { if (confirm('データを初期状態に戻しますか？')) reset() }}>データをリセット（デモ用）</button>

      <p className="hint center">KINDAI GROWTH MVP — 努力が見える・続く・得をする</p>
    </>
  )
}
