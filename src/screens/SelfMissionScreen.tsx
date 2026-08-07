import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { selfReward } from '../data/selfMissions'
import { CATEGORY_TO_STAT, type Category } from '../data/types'
import type { Route } from '../App'

const CATS: { key: Category; emoji: string; label: string }[] = [
  { key: '勉強', emoji: '📘', label: '勉強' },
  { key: '運動', emoji: '🏃', label: '運動' },
  { key: '生活習慣', emoji: '⚡', label: '生活習慣' },
  { key: '振り返り', emoji: '✨', label: '振り返り' },
]

// 目標時間（分）。0 = 自由（タイマーは計測のみ）
const TIMES: { min: number; label: string }[] = [
  { min: 10, label: '10分' },
  { min: 30, label: '30分' },
  { min: 60, label: '60分' },
  { min: 0, label: '自由' },
]

export function SelfMissionScreen({
  go,
  notify,
  onLevelUp,
}: {
  go: (r: Route) => void
  notify: (m: string) => void
  onLevelUp: (lv: number) => void
}) {
  const { completeSelf } = useApp()
  const [category, setCategory] = useState<Category>('勉強')
  const [minutes, setMinutes] = useState(30)
  const [content, setContent] = useState('')

  const title = content.trim() || category
  const rw = minutes > 0 ? selfReward(minutes) : null

  const startTimer = () => {
    go({
      name: 'timer',
      mission: {
        kind: 'self',
        title,
        category,
        targetMinutes: minutes, // 0 = 自由
        rewardSp: rw?.sp ?? 0,
        rewardExp: rw?.exp ?? 0,
        statAmount: rw?.statAmount ?? 1,
      },
    })
  }

  // タイマーを使わず、選んだ目標時間でそのまま記録（自由の場合は15分扱い）
  const quickComplete = () => {
    const res = completeSelf({ title, category, minutes: minutes > 0 ? minutes : 15, comment: '' })
    if (res.leveledUp) onLevelUp(res.newLevel)
    else notify(`記録しました！ スコア +${res.gainedSP} 🎉`)
    go({ name: 'home' })
  }

  return (
    <>
      <PageHead title="セルフミッション" onBack={() => go({ name: 'home' })} />

      <div className="section-card" style={{ marginTop: 8 }}>
        <div className="bold center" style={{ fontSize: 17 }}>セルフミッションを始める</div>
        <div className="muted center" style={{ fontSize: 12, marginTop: 4 }}>自分の目標を設定して、タイマーで取り組もう！</div>

        <div className="field-label">カテゴリを選ぶ</div>
        <div className="cat-grid">
          {CATS.map((c) => (
            <button key={c.key} className={'cat-tile' + (category === c.key ? ' active' : '')} onClick={() => setCategory(c.key)}>
              <span className="cat-emoji">{c.emoji}</span>
              <span className="cat-name">{c.label}</span>
              <span className="cat-stat">{CATEGORY_TO_STAT[c.key]}+</span>
            </button>
          ))}
        </div>

        <div className="field-label">目標時間を選ぶ</div>
        <div className="chip-row">
          {TIMES.map((t) => (
            <button key={t.label} className={'time-chip' + (minutes === t.min ? ' active' : '')} onClick={() => setMinutes(t.min)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="field-label">取り組む内容（任意）</div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 100))}
          placeholder="例）英語の長文を読む、腕立て伏せをする など"
          style={{ minHeight: 84 }}
        />
        <div className="muted" style={{ fontSize: 11, textAlign: 'right', marginTop: 2 }}>{content.length} / 100</div>

        <div className="info-note">
          ⓘ タイマー終了後、成果を記録して報酬や進捗を獲得できます。
          {rw ? `（目安：スコア+${rw.sp} / EXP+${rw.exp} / ${CATEGORY_TO_STAT[category]}+${rw.statAmount}）` : '（取り組んだ時間に応じて加算）'}
        </div>
      </div>

      <button className="btn-primary" style={{ marginTop: 12 }} onClick={startTimer}>⏱ タイマー開始</button>
      <button className="btn-ghost" style={{ marginTop: 10 }} onClick={quickComplete}>タイマーを使わずに記録する</button>
    </>
  )
}
