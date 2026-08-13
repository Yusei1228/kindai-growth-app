import { useState } from 'react'
import { useApp } from '../store'
import { RewardBurst } from '../components/RewardBurst'
import { TUTORIAL_STEPS, TUTORIAL_REWARD } from '../data/tutorial'
import { playSound } from '../lib/sound'
import type { Route } from '../App'

interface Burst {
  sp: number
  exp: number
  leveledUp: boolean
  newLevel: number
}

export function TutorialScreen({ go, onLevelUp }: { go: (r: Route) => void; onLevelUp: (lv: number) => void }) {
  const { completeTutorial } = useApp()
  const [step, setStep] = useState(0)
  const [burst, setBurst] = useState<Burst | null>(null)
  const s = TUTORIAL_STEPS[step]
  const last = step === TUTORIAL_STEPS.length - 1

  const finish = () => {
    const res = completeTutorial()
    playSound('reward')
    setBurst({ sp: TUTORIAL_REWARD.sp, exp: TUTORIAL_REWARD.exp, leveledUp: res.leveledUp, newLevel: res.newLevel })
  }
  const finishBurst = () => {
    const b = burst
    setBurst(null)
    if (b?.leveledUp) onLevelUp(b.newLevel)
    go({ name: 'daily' })
  }

  return (
    <div className="tut-wrap">
      <div className="tut-card">
        <div className="tut-step-label">チュートリアル {step + 1} / {TUTORIAL_STEPS.length}</div>
        <div className="tut-emoji">{s.emoji}</div>
        <h2 className="tut-title">{s.title}</h2>
        <p className="tut-body">{s.body}</p>

        {last && (
          <div className="tut-reward">
            <span className="tut-rw-chip">スコア +{TUTORIAL_REWARD.sp}</span>
            <span className="tut-rw-chip exp">EXP +{TUTORIAL_REWARD.exp}</span>
            <span className="tut-rw-chip lv">レベルアップ！</span>
          </div>
        )}

        <div className="tut-dots">
          {TUTORIAL_STEPS.map((_, i) => (
            <span key={i} className={'tut-dot' + (i === step ? ' on' : '') + (i < step ? ' past' : '')} />
          ))}
        </div>

        <div className="tut-btns">
          {step > 0 && (
            <button className="tut-back" onClick={() => setStep(step - 1)} data-sound="back">戻る</button>
          )}
          {!last ? (
            <button className="tut-next" onClick={() => setStep(step + 1)}>次へ ›</button>
          ) : (
            <button className="tut-next tut-finish" onClick={finish} disabled={!!burst} data-sound="none">完了して報酬を受け取る 🎁</button>
          )}
        </div>
      </div>

      {burst && (
        <RewardBurst sp={burst.sp} exp={burst.exp} stat="全ステータス" statAmount={TUTORIAL_REWARD.statAmount} bonus onDone={finishBurst} />
      )}
    </div>
  )
}
