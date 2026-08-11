import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { RewardBurst } from '../components/RewardBurst'
import { LOGIN_BONUS_DAYS, loginBonusReward } from '../data/loginBonus'

interface Burst { sp: number; exp: number; milestone: boolean; leveledUp: boolean; newLevel: number }

export function LoginBonusScreen({ back, onLevelUp }: { back: () => void; onLevelUp: (lv: number) => void }) {
  const { state, loginBonusAvailable, claimLoginBonus } = useApp()
  const claimed = state.loginBonus.claimedDays
  const nextDay = Math.min(LOGIN_BONUS_DAYS, claimed + 1)
  const [burst, setBurst] = useState<Burst | null>(null)

  const onClaim = () => {
    const res = claimLoginBonus()
    if (res) setBurst({ sp: res.sp, exp: res.exp, milestone: res.milestone, leveledUp: res.leveledUp, newLevel: res.newLevel })
  }
  const finishBurst = () => {
    const b = burst
    setBurst(null)
    if (b?.leveledUp) onLevelUp(b.newLevel)
  }

  const days = Array.from({ length: LOGIN_BONUS_DAYS }, (_, i) => i + 1)

  return (
    <>
      <PageHead title="ログインボーナス" onBack={back} />
      <p className="muted center" style={{ fontSize: 12, marginTop: 2 }}>
        毎日ログインで受け取れる！ 続けるほどSPとEXPが増えていきます（毎月リセット・30日分）
      </p>

      {/* 今日の受け取りカード */}
      <div className={'lb-today' + (loginBonusAvailable ? ' ready' : ' done')}>
        {loginBonusAvailable ? (
          <>
            <div className="lb-today-head">
              <span className="lb-today-day">Day {nextDay}</span>
              {loginBonusReward(nextDay).milestone && <span className="lb-star">⭐ ボーナスDay</span>}
            </div>
            <div className="lb-today-rewards">
              <span className="lb-chip lb-sp">スコア +{loginBonusReward(nextDay).sp}</span>
              <span className="lb-chip lb-exp">EXP +{loginBonusReward(nextDay).exp}</span>
            </div>
            <button className="lb-claim-btn" onClick={onClaim} disabled={!!burst}>
              受け取る 🎁
            </button>
          </>
        ) : (
          <div className="lb-done-msg">
            <div className="lb-done-ico">✅</div>
            <div className="bold" style={{ fontSize: 15 }}>本日分は受け取り済み</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {claimed >= LOGIN_BONUS_DAYS ? '今月分はすべて受け取りました！お見事 🎉' : 'また明日ログインして続きを受け取ろう'}
            </div>
          </div>
        )}
      </div>

      <div className="section-title">今月のカレンダー <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>（{claimed}/{LOGIN_BONUS_DAYS}日）</span></div>
      <div className="lb-grid">
        {days.map((d) => {
          const rw = loginBonusReward(d)
          const isClaimed = d <= claimed
          const isToday = d === nextDay && loginBonusAvailable
          return (
            <div key={d} className={'lb-cell' + (isClaimed ? ' claimed' : '') + (isToday ? ' today' : '') + (rw.milestone ? ' milestone' : '')}>
              <div className="lb-cell-day">Day{d}</div>
              <div className="lb-cell-ico">{isClaimed ? '✓' : rw.milestone ? '🎁' : '🔹'}</div>
              <div className="lb-cell-sp">+{rw.sp}</div>
              <div className="lb-cell-exp">EXP+{rw.exp}</div>
            </div>
          )
        })}
      </div>

      <p className="hint center">⭐ 7日ごと（7・14・21・28日目）と最終日30日目は追加ボーナス！</p>

      {burst && (
        <RewardBurst sp={burst.sp} exp={burst.exp} stat="" statAmount={0} bonus={burst.milestone} onDone={finishBurst} />
      )}
    </>
  )
}
