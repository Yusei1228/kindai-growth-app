import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { CATEGORY_TO_STAT, type ActiveMission } from '../data/types'
import type { Route } from '../App'

export function ReviewScreen({
  mission,
  minutes,
  go,
  notify,
  onLevelUp,
}: {
  mission: ActiveMission
  minutes: number
  go: (r: Route) => void
  notify: (m: string) => void
  onLevelUp: (lv: number) => void
}) {
  const { completeDaily, completeSelf } = useApp()
  const [rating, setRating] = useState(4)
  const [comment, setComment] = useState('')

  const now = new Date()
  const start = new Date(now.getTime() - minutes * 60000)
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const stat = CATEGORY_TO_STAT[mission.category]

  const submit = () => {
    const res =
      mission.kind === 'daily' && mission.missionId
        ? completeDaily({ missionId: mission.missionId, minutes, rating, comment })
        : completeSelf({ title: mission.title, category: mission.category, minutes, comment })

    if (res.leveledUp) {
      onLevelUp(res.newLevel)
    } else if (res.dailyBonus) {
      notify(`3件達成ボーナス！ スコア +${res.gainedSP} 🎉`)
    } else {
      notify(`記録しました！ スコア +${res.gainedSP} / EXP +${mission.rewardExp} 🎉`)
    }
    go({ name: mission.kind === 'daily' ? 'daily' : 'home' })
  }

  return (
    <>
      <PageHead title="レビュー・振り返り" onBack={() => go({ name: 'timer', mission })} />

      <div className="section-card">
        <div className="bold" style={{ fontSize: 16 }}>{mission.title}</div>
        <div className="reward-grid" style={{ background: 'transparent', padding: '10px 0 0' }}>
          <div><span className="k">実行時間</span><span className="v">{minutes}分</span></div>
          <div><span className="k">カテゴリー</span><span className="v">{mission.category}</span></div>
          <div style={{ gridColumn: '1 / -1' }}><span className="k">実施時刻</span><span className="v">{hhmm(start)}〜{hhmm(now)}</span></div>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8 }}>
          <div className="bold" style={{ fontSize: 13, marginBottom: 6 }}>獲得報酬</div>
          <div className="reward-grid" style={{ background: 'transparent', padding: 0 }}>
            <div><span className="k">スコア</span><span className="v" style={{ color: 'var(--blue-600)' }}>+{mission.rewardSp}</span></div>
            <div><span className="k">EXP</span><span className="v">+{mission.rewardExp}</span></div>
            <div><span className="k">{stat}</span><span className="v">+{mission.statAmount}</span></div>
            {mission.kind === 'daily' && <div><span className="k">3件達成ボーナス</span><span className="v">+50</span></div>}
          </div>
        </div>
      </div>

      <div className="section-title">達成度</div>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={'star' + (n <= rating ? ' on' : '')} onClick={() => setRating(n)}>★</span>
        ))}
      </div>

      <div className="section-title">実施内容・コメント（任意）</div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="何をしましたか？今日の感想や次に改善したいことなど&#10;例：TOEIC文法、英単語、レポート作成など"
      />

      <div className="section-title">証拠写真（任意）</div>
      <div className="photo-drop">
        <div className="muted" style={{ marginBottom: 8 }}>Coming Soon</div>
        <button className="btn-ghost" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => notify('写真添付は近日対応')}>写真を追加</button>
      </div>

      <p className="hint">
        ・レビュー内容は振り返りに記録されます（スコアは達成時に固定で付与）<br />
        ・長時間記録の場合は確認材料として使用されることがあります
      </p>

      <button className="btn-primary" style={{ marginTop: 8 }} onClick={submit}>記録して報酬を受け取る</button>
    </>
  )
}
