import { useEffect, useState } from 'react'

// 達成報酬の演出（約1.4秒）：キラキラの放射＋数値のカウントアップ
function useCountUp(target: number, ms = 650): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3)))) // easeOut
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function RewardBurst({
  sp,
  exp,
  stat,
  statAmount,
  bonus,
  onDone,
}: {
  sp: number
  exp: number
  stat: string
  statAmount: number
  bonus: boolean
  onDone: () => void
}) {
  const spv = useCountUp(sp)
  const expv = useCountUp(exp)
  const stv = useCountUp(statAmount, 550)

  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="rb-overlay" onClick={onDone}>
      <div className="rb-card">
        <div className="rb-burst">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="rb-spark" style={{ ['--a' as string]: `${i * 30}deg`, ['--d' as string]: `${0.03 * i}s` }}>✦</span>
          ))}
        </div>
        <div className="rb-badge">🎉</div>
        <div className="rb-title">ミッション達成！</div>
        <div className="rb-rows">
          <div className="rb-row"><span className="rb-k">スコア</span><span className="rb-v">+{spv}</span></div>
          <div className="rb-row"><span className="rb-k">EXP</span><span className="rb-v">+{expv}</span></div>
          <div className="rb-row"><span className="rb-k">{stat}</span><span className="rb-v">+{stv}</span></div>
        </div>
        {bonus && <div className="rb-bonus">✨ 3件達成ボーナス +50 ✨</div>}
      </div>
    </div>
  )
}
