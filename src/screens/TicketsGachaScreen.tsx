import { useEffect, useState } from 'react'
import { PageHead } from '../components/ui'
import { getSummary, spinGacha, type RewardSummary, type GachaResult } from '../lib/rewards'
import { playSound } from '../lib/sound'
import type { Route } from '../App'

export function TicketsGachaScreen({ go, back, notify }: { go: (r: Route) => void; back: () => void; notify: (m: string) => void }) {
  const [summary, setSummary] = useState<RewardSummary | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<GachaResult | null>(null)

  const load = async () => setSummary(await getSummary())
  useEffect(() => {
    load()
  }, [])

  const canSpin = !!summary && summary.balance > 0 && summary.weekSpins < summary.weekLimit && !spinning

  const spin = async () => {
    if (!canSpin) return
    setSpinning(true)
    setResult(null)
    playSound('slide')
    try {
      // 演出（サーバー抽選と並行して見せる）
      const [res] = await Promise.all([spinGacha(), new Promise((r) => setTimeout(r, 1400))])
      setResult(res)
      playSound('reward')
      await load()
    } catch (e) {
      const msg = (e as Error).message
      notify(msg === 'no_tickets' ? '抽選券が足りません' : msg === 'weekly_limit' ? '今週の上限（7回）に達しました' : '抽選に失敗しました')
    } finally {
      setSpinning(false)
    }
  }

  return (
    <>
      <PageHead title="所持チケット" onBack={back} />

      <div className="section-card center rw-ticket-hero">
        <div className="rw-ticket-big">🎟️</div>
        <div className="rw-ticket-count">{summary?.balance ?? 0}<span style={{ fontSize: 16, fontWeight: 800 }}> 枚</span></div>
        <div className="muted" style={{ fontSize: 12 }}>
          今週の抽選 {summary?.weekSpins ?? 0} / {summary?.weekLimit ?? 7} 回
        </div>
      </div>

      {/* ガチャ本体 */}
      <div className="section-card center" style={{ paddingTop: 22, paddingBottom: 22 }}>
        <div className={'rw-gacha-ball' + (spinning ? ' spin' : '')}>
          {result ? <span className="rw-gacha-prize">{result.emoji}</span> : <span>🎁</span>}
        </div>

        {result ? (
          <>
            <div className="rw-win-tag">{result.kind}</div>
            <div className="bold" style={{ fontSize: 18, marginTop: 4 }}>{result.title}</div>
            <div className="muted" style={{ fontSize: 12 }}>{result.sponsor_name}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>受け取りBOXに届きました 🎉</p>
            <div className="row gap12" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="btn-ghost" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => setResult(null)} disabled={!canSpin}>もう一度</button>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => go({ name: 'reward-box' })}>受け取りBOXへ</button>
            </div>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13, margin: '10px 0 14px' }}>
              {spinning ? '抽選中…' : canSpin ? '抽選券を1枚使ってガチャを回そう' : summary && summary.weekSpins >= summary.weekLimit ? '今週の抽選は上限に達しました' : '抽選券がありません（ミッションを達成しよう）'}
            </p>
            <button className="btn-primary rw-spin-btn" onClick={spin} disabled={!canSpin}>
              {spinning ? '抽選中…' : '🎰 ガチャを回す（券1枚）'}
            </button>
          </>
        )}
      </div>

      <p className="hint center">当選内容はサーバー側で決定されます。券が足りないときはミッションを達成して貯めよう。</p>
    </>
  )
}
