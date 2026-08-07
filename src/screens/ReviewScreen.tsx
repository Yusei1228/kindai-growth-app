import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { CATEGORY_TO_STAT, type ActiveMission, type StatKey } from '../data/types'
import { selfMissionReward } from '../data/selfMissions'
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
  const [content, setContent] = useState(mission.title)
  const [focus, setFocus] = useState(3) // 集中度
  const [hard, setHard] = useState(3) // きつさ
  const [comment, setComment] = useState('')

  const reward =
    mission.kind === 'self' && mission.self
      ? selfMissionReward(mission.self, minutes)
      : { sp: mission.rewardSp, exp: mission.rewardExp, statAmount: mission.statAmount }

  const stats: StatKey[] = mission.kind === 'self' && mission.self ? mission.self.stats : [CATEGORY_TO_STAT[mission.category]]

  const submit = () => {
    const memo = [content.trim(), comment.trim() ? `メモ:${comment.trim()}` : '', `きつさ${hard}/5`].filter(Boolean).join(' / ')
    const res =
      mission.kind === 'daily' && mission.missionId
        ? completeDaily({ missionId: mission.missionId, minutes, rating: focus, comment: memo })
        : completeSelf({ mission: mission.self!, minutes, comment: memo, rating: focus })

    if (res.leveledUp) onLevelUp(res.newLevel)
    else if (res.dailyBonus) notify(`3件達成ボーナス！ スコア +${res.gainedSP} 🎉`)
    else notify(`記録しました！ スコア +${res.gainedSP} / EXP +${reward.exp} 🎉`)
    go({ name: mission.kind === 'daily' ? 'daily' : 'home' })
  }

  return (
    <>
      <PageHead title="レビュー" onBack={() => go(mission.kind === 'daily' ? { name: 'daily' } : { name: 'self' })} />
      <p className="center" style={{ fontSize: 14, fontWeight: 800, marginTop: 6 }}>ミッションお疲れさまでした！</p>
      <p className="muted center" style={{ fontSize: 12, marginTop: 2 }}>記録を残して報酬を受け取りましょう。</p>

      <div className="field-label">実行内容</div>
      <input
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, 40))}
        placeholder="例）ランニングを20分行った"
        style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 12, padding: '12px', fontSize: 15, fontFamily: 'inherit', background: '#f8fafc' }}
      />

      <div className="field-label">集中度 <span className="muted" style={{ fontWeight: 700 }}>{focus} / 5</span></div>
      <StarRow value={focus} onChange={setFocus} loLabel="低い" hiLabel="高い" />

      <div className="field-label">きつさ <span className="muted" style={{ fontWeight: 700 }}>{hard} / 5</span></div>
      <StarRow value={hard} onChange={setHard} loLabel="楽だった" hiLabel="きつかった" />

      <div className="field-label">コメント（任意）</div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 200))} placeholder="自由に入力してください" style={{ minHeight: 90 }} />
      <div className="muted" style={{ fontSize: 11, textAlign: 'right', marginTop: 2 }}>{comment.length} / 200</div>

      <div className="section-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span className="muted" style={{ fontSize: 13 }}>{minutes > 0 ? `${minutes}分の記録` : '記録'}</span>
        <span className="bold" style={{ color: 'var(--blue-600)' }}>
          スコア+{reward.sp} / EXP+{reward.exp} / {stats.join('・')}+{reward.statAmount}
        </span>
      </div>

      <button className="btn-primary" style={{ marginTop: 12 }} onClick={submit}>
        記録して報酬を受け取る
      </button>
    </>
  )
}

function StarRow({ value, onChange, loLabel, hiLabel }: { value: number; onChange: (n: number) => void; loLabel: string; hiLabel: string }) {
  return (
    <div>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={'star' + (n <= value ? ' on' : '')} onClick={() => onChange(n)}>★</span>
        ))}
      </div>
      <div className="row between" style={{ marginTop: 2 }}>
        <span className="muted" style={{ fontSize: 11 }}>{loLabel}</span>
        <span className="muted" style={{ fontSize: 11 }}>{hiLabel}</span>
      </div>
    </div>
  )
}
