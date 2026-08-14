import { useLayoutEffect, useState, useEffect } from 'react'
import { TUTORIAL_REWARD } from '../data/tutorial'

interface TourStep {
  target: string | null // data-tour 値（null=中央カード）
  title: string
  body: string
  final?: boolean
}

const TOUR: TourStep[] = [
  { target: 'profile', title: 'あなたのプロフィール', body: 'ここに名前とレベルが表示されます。ミッションを続けてレベルアップを目指そう！' },
  { target: 'exp', title: '経験値（EXP）バー', body: 'ミッション達成でEXPが貯まり、満タンになると【レベルアップ】します。' },
  { target: 'sp', title: 'SP（累計スコア）', body: '努力の合計スコアです。この数字でみんなとランキングを競います。' },
  { target: 'stats', title: '4つのステータス', body: '体力・知力・活力・魅力。取り組む内容に応じて、ここが伸びていきます。' },
  { target: 'missions', title: '2つのミッション', body: '「デイリー」は毎日の3件、「セルフ」は自分の目標。達成でスコアUP！' },
  { target: 'loginbonus', title: 'ログインボーナス', body: '毎日ここから受け取れます。続けるほどもらえる量が増えます。' },
  { target: 'nav-ranking', title: 'ランキング', body: '画面下のここをタップすると、みんなとの順位をいつでも確認できます。' },
  { target: null, final: true, title: '準備完了！', body: 'さっそく始めよう。完了ボタンでボーナスを受け取ると、いきなりレベルアップします！' },
]

interface Box { top: number; left: number; width: number; height: number }

export function TutorialTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [phoneH, setPhoneH] = useState(800)
  const s = TOUR[step]
  const isFinal = !!s.final
  const PAD = 8

  useLayoutEffect(() => {
    const compute = () => {
      const phone = document.querySelector('.phone') as HTMLElement | null
      if (phone) setPhoneH(phone.getBoundingClientRect().height)
      if (!s.target) {
        setBox(null)
        return
      }
      const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null
      if (!el || !phone) {
        setBox(null)
        return
      }
      const r = el.getBoundingClientRect()
      const p = phone.getBoundingClientRect()
      setBox({ top: r.top - p.top, left: r.left - p.left, width: r.width, height: r.height })
    }
    compute()
    window.addEventListener('resize', compute)
    const t = window.setTimeout(compute, 60) // レイアウト確定後に再計測
    return () => {
      window.removeEventListener('resize', compute)
      window.clearTimeout(t)
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => setStep((v) => Math.min(TOUR.length - 1, v + 1))
  const prev = () => setStep((v) => Math.max(0, v - 1))

  // ツールチップの縦位置：スポットライトの下に置く余裕が無ければ上に
  const TIP_H = isFinal ? 210 : 168
  let tipTop = phoneH / 2 - TIP_H / 2
  if (box) {
    const below = box.top + box.height + PAD + 14
    if (below + TIP_H < phoneH - 88) tipTop = below
    else tipTop = Math.max(14, box.top - PAD - 14 - TIP_H)
  }

  return (
    <div className="tour-overlay">
      {box ? (
        <div
          className="tour-hole"
          style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
        />
      ) : (
        <div className="tour-dim" />
      )}

      <div className="tour-tip" style={{ top: tipTop }}>
        <div className="tour-step">STEP {step + 1} / {TOUR.length}</div>
        <div className="tour-title">{s.title}</div>
        <div className="tour-body">{s.body}</div>

        {isFinal && (
          <div className="tour-reward">
            <span className="tour-rw">スコア +{TUTORIAL_REWARD.sp}</span>
            <span className="tour-rw exp">EXP +{TUTORIAL_REWARD.exp}</span>
            <span className="tour-rw lv">Lv.UP</span>
          </div>
        )}

        <div className="tour-dots">
          {TOUR.map((_, i) => (
            <span key={i} className={'tour-dot' + (i === step ? ' on' : '') + (i < step ? ' past' : '')} />
          ))}
        </div>

        <div className="tour-btns">
          {step > 0 && <button className="tour-back" onClick={prev} data-sound="back">戻る</button>}
          {!isFinal ? (
            <button className="tour-next" onClick={next}>次へ ›</button>
          ) : (
            <button className="tour-next tour-finish" onClick={onComplete} data-sound="none">完了して報酬を受け取る 🎁</button>
          )}
        </div>
      </div>
    </div>
  )
}

// 経験値吸収エフェクト：右下からキラキラがEXPバーに集まり、バーが光る
/** チュートリアル開始前の「ここをタップ」誘導スポットライト（対象は実際にタップ可能） */
export function GuideSpotlight({ selector, message }: { selector: string; message: string }) {
  const [box, setBox] = useState<Box | null>(null)
  const [phoneH, setPhoneH] = useState(800)

  useLayoutEffect(() => {
    const compute = () => {
      const phone = document.querySelector('.phone') as HTMLElement | null
      const el = document.querySelector(selector) as HTMLElement | null
      if (!phone || !el) {
        setBox(null)
        return
      }
      const p = phone.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      setPhoneH(p.height)
      setBox({ top: r.top - p.top, left: r.left - p.left, width: r.width, height: r.height })
    }
    compute()
    // 画面遷移やレイアウト確定後にも追従できるよう定期的に再計測
    const iv = window.setInterval(compute, 300)
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true)
    return () => {
      window.clearInterval(iv)
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [selector])

  if (!box) return null
  const PAD = 6
  const belowTop = box.top + box.height + PAD + 12
  const showBelow = belowTop + 56 < phoneH - 78
  const tipTop = showBelow ? belowTop : Math.max(10, box.top - PAD - 56)

  return (
    <div className="guide-overlay">
      <div
        className="guide-hole"
        style={{ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 }}
      />
      <div className="guide-tip" style={{ top: tipTop }}>
        <span className="guide-hand">{showBelow ? '👆' : '👇'}</span> {message}
      </div>
    </div>
  )
}

const SPARKS = Array.from({ length: 12 }, (_, i) => i)

export function ExpAbsorb({ onDone }: { onDone: () => void }) {
  const [pts, setPts] = useState<{ sx: number; sy: number; tx: number; ty: number } | null>(null)

  useLayoutEffect(() => {
    const phone = document.querySelector('.phone') as HTMLElement | null
    const el = document.querySelector('[data-tour="exp"]') as HTMLElement | null
    if (!phone) return
    const p = phone.getBoundingClientRect()
    let tx = p.width - 60
    let ty = 90
    if (el) {
      const r = el.getBoundingClientRect()
      tx = r.left - p.left + r.width / 2
      ty = r.top - p.top + r.height / 2
      el.classList.add('exp-charge')
    }
    setPts({ sx: p.width - 46, sy: p.height - 96, tx, ty })
    return () => {
      el?.classList.remove('exp-charge')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(onDone, 1250)
    return () => window.clearTimeout(t)
  }, [onDone])

  if (!pts) return null
  return (
    <div className="exp-fx">
      {SPARKS.map((i) => {
        const jx = ((i % 4) - 1.5) * 10
        const jy = (Math.floor(i / 4) - 1) * 12
        return (
          <span
            key={i}
            className="exp-spark"
            style={{
              left: pts.sx + jx,
              top: pts.sy + jy,
              ['--dx' as string]: pts.tx - (pts.sx + jx) + 'px',
              ['--dy' as string]: pts.ty - (pts.sy + jy) + 'px',
              animationDelay: 0.04 * i + 's',
            }}
          >
            ✦
          </span>
        )
      })}
    </div>
  )
}
