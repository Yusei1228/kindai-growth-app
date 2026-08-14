import { useEffect, useRef, useState } from 'react'
import { PageHead } from '../components/ui'
import { useCoupon, type Coupon } from '../lib/rewards'
import { playSound } from '../lib/sound'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
function hhmmss(d: Date): string {
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':')
}
// 使用番号（末尾4桁を秒ごとに更新＝スクショ悪用を防ぐ動的コード）
function liveCode(sec: number): string {
  return String(1000 + ((sec * 7919) % 9000))
}

export function CouponUseScreen({ coupon, back, notify }: { coupon: Coupon; back: () => void; notify: (m: string) => void }) {
  const [now, setNow] = useState(() => new Date())
  const [used, setUsed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // ===== スライドして使用 =====
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [dragX, setDragX] = useState(0) // 0..max
  const draggingRef = useRef(false)
  const KNOB = 52

  const maxX = () => {
    const w = trackRef.current?.clientWidth ?? 300
    return Math.max(0, w - KNOB - 8)
  }
  const onDown = (e: React.PointerEvent) => {
    if (used || busy) return
    draggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const rect = trackRef.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(maxX(), e.clientX - rect.left - KNOB / 2))
    setDragX(x)
  }
  const onUp = async () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (dragX >= maxX() * 0.85) {
      setDragX(maxX())
      await commit()
    } else {
      setDragX(0)
    }
  }

  const commit = async () => {
    if (busy || used) return
    setBusy(true)
    try {
      await useCoupon(coupon.id)
      playSound('complete')
      setUsed(true)
    } catch (e) {
      const msg = (e as Error).message
      notify(msg === 'not_usable' ? 'このクーポンは使用できません（期限切れ/使用済み）' : '使用に失敗しました')
      setDragX(0)
    } finally {
      setBusy(false)
    }
  }

  const sec = now.getSeconds()

  if (used) {
    return (
      <>
        <PageHead title="クーポン利用" onBack={back} />
        <div className="section-card center" style={{ marginTop: 20, paddingTop: 26, paddingBottom: 26 }}>
          <div className="rw-used-check">✓</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, margin: '12px 0 4px' }}>使用済みにしました</h3>
          <div className="muted" style={{ fontSize: 13 }}>{coupon.sponsor_name}</div>
          <div className="bold" style={{ fontSize: 16, marginTop: 2 }}>{coupon.title}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>使用時刻 {hhmmss(now)}</div>
        </div>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={back}>マイクーポンに戻る</button>
      </>
    )
  }

  return (
    <>
      <PageHead title="クーポン利用" onBack={back} />

      {/* 提示カード（店員に見せる） */}
      <div className="rw-present">
        <div className="rw-present-shine" style={{ transform: `translateX(${(sec / 60) * 120 - 60}%)` }} />
        <div className="muted" style={{ fontSize: 11 }}>店舗名</div>
        <div className="bold" style={{ fontSize: 22 }}>{coupon.sponsor_name}</div>
        <div className="rw-present-badge">{coupon.emoji} {coupon.title}</div>
        <div className="row between" style={{ marginTop: 14, alignItems: 'flex-end' }}>
          <div>
            <div className="muted" style={{ fontSize: 10 }}>有効期限</div>
            <div className="bold" style={{ fontSize: 13 }}>{fmtDate(coupon.expires_at)}まで</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted" style={{ fontSize: 10 }}>クーポン番号</div>
            <div className="bold" style={{ fontSize: 13 }}>{coupon.code}</div>
          </div>
        </div>
        {/* 動的要素（スクショ悪用対策：時刻＋確認コードが毎秒変化） */}
        <div className="rw-present-live">
          <span className="rw-live-dot" /> {hhmmss(now)} ・ 確認コード {liveCode(sec)}
        </div>
      </div>

      <p className="muted center" style={{ fontSize: 12, margin: '12px 4px', lineHeight: 1.6 }}>
        店舗スタッフにこの画面を提示してください。確認後、下のバーを右へスライドすると使用済みになります。
      </p>

      <div className="section-card" style={{ paddingTop: 12, paddingBottom: 12 }}>
        <div className="bold" style={{ fontSize: 13, marginBottom: 8 }}>ご利用条件</div>
        <ul className="rw-cond">
          <li>1人1回まで</li>
          <li>他クーポンとの併用不可</li>
        </ul>
      </div>

      {/* スライドして使用 */}
      <div className={'rw-slide' + (busy ? ' busy' : '')} ref={trackRef}>
        <div className="rw-slide-fill" style={{ width: dragX + KNOB + 8 + 'px' }} />
        <div className="rw-slide-label">スライドして使用 ▶</div>
        <div
          className="rw-slide-knob"
          style={{ transform: `translateX(${dragX}px)` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="slider"
          aria-label="スライドして使用"
          data-sound="none"
        >
          {busy ? '…' : '🎫'}
        </div>
      </div>

      <p className="hint center">※ スライドすると使用済みになります。一度使用済みにすると元に戻せません。</p>
    </>
  )
}
