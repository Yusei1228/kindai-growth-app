import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import type { Route } from '../App'

export function ReviewScreen({
  missionId,
  minutes,
  go,
  notify,
  onLevelUp,
}: {
  missionId: string
  minutes: number
  go: (r: Route) => void
  notify: (m: string) => void
  onLevelUp: (lv: number) => void
}) {
  const { state, completeMission } = useApp()
  const mission = state.missions.find((m) => m.id === missionId)!
  const [rating, setRating] = useState(4)
  const [comment, setComment] = useState('')

  const overshoot = Math.max(0, minutes - mission.targetMinutes)
  const timeBonus = Math.round(overshoot * 1.5)
  const base = mission.reward.sp * 10 // 表示用のポイント換算（演出）
  const totalPt = base + timeBonus * 10

  const now = new Date()
  const start = new Date(now.getTime() - minutes * 60000)
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  const submit = () => {
    const res = completeMission({ missionId, minutes, rating, comment })
    if (res.leveledUp) {
      onLevelUp(res.newLevel)
    } else {
      notify('記録しました！報酬を獲得 🎉')
    }
    go({ name: 'daily' })
  }

  return (
    <>
      <PageHead title="レビュー・振り返り" onBack={() => go({ name: 'timer', missionId })} />

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
            <div><span className="k">基本報酬</span><span className="v">{base} pt</span></div>
            <div><span className="k">時間ボーナス</span><span className="v">+{timeBonus * 10} pt</span></div>
            <div style={{ gridColumn: '1 / -1' }}><span className="k">合計</span><span className="v" style={{ color: 'var(--blue-600)' }}>{totalPt} pt</span></div>
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
        ・レビュー内容は振り返りとスコア反映に使用されます<br />
        ・長時間記録の場合は確認材料として使用されることがあります
      </p>

      <button className="btn-primary" style={{ marginTop: 8 }} onClick={submit}>記録して報酬を受け取る</button>
    </>
  )
}
