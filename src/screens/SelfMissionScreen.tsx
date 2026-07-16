import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { SELF_PRESETS, SELF_REWARD, CATEGORIES } from '../data/selfMissions'
import { CATEGORY_TO_STAT, type Category } from '../data/types'
import type { Route } from '../App'

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
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('勉強')
  const [minutes, setMinutes] = useState(15)
  const [comment, setComment] = useState('')

  const selectPreset = (t: string, c: Category) => {
    setTitle(t)
    setCategory(c)
  }

  const submit = () => {
    const res = completeSelf({ title, category, minutes, comment })
    if (res.leveledUp) onLevelUp(res.newLevel)
    else notify(`記録しました！ スコア +${res.gainedSP} / EXP +${SELF_REWARD.exp} 🎉`)
    go({ name: 'home' })
  }

  return (
    <>
      <PageHead title="セルフミッション" onBack={() => go({ name: 'home' })} />

      <p className="hint" style={{ marginTop: 4 }}>
        自分の努力を記録しよう。下から選ぶか、自由に入力できます。
      </p>

      <div className="section-title">よく使うミッション</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {SELF_PRESETS.map((p) => {
          const active = title === p.title && category === p.category
          return (
            <button
              key={p.title}
              onClick={() => selectPreset(p.title, p.category)}
              style={{
                border: active ? '1px solid var(--blue-600)' : '1px solid var(--line)',
                background: active ? 'var(--blue-50)' : '#fff',
                color: active ? 'var(--blue-700)' : 'var(--ink)',
                borderRadius: 999, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {p.emoji} {p.title}
            </button>
          )
        })}
      </div>

      <div className="section-title">内容（自由入力）</div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="例：TOEICの勉強、ジムで筋トレ"
        maxLength={30}
        style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 12, padding: '12px', fontSize: 15, fontFamily: 'inherit', background: '#f8fafc' }}
      />

      <div className="section-title">カテゴリー（伸びるステータス）</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              flex: 1, border: category === c ? '1px solid var(--blue-600)' : '1px solid var(--line)',
              background: category === c ? 'var(--blue-600)' : '#fff', color: category === c ? '#fff' : 'var(--ink-soft)',
              borderRadius: 12, padding: '10px 4px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}
          >
            {c}<br /><span style={{ fontSize: 10, opacity: 0.85 }}>{CATEGORY_TO_STAT[c]}+</span>
          </button>
        ))}
      </div>

      <div className="section-title">取り組んだ時間（任意）</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[5, 15, 30, 60].map((m) => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            style={{
              border: minutes === m ? '1px solid var(--blue-600)' : '1px solid var(--line)',
              background: minutes === m ? 'var(--blue-50)' : '#fff', color: minutes === m ? 'var(--blue-700)' : 'var(--ink)',
              borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {m}分
          </button>
        ))}
      </div>

      <div className="section-title">ひとことメモ（任意）</div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="今日やったこと・感想など" style={{ minHeight: 80 }} />

      <div className="section-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 13 }}>達成すると</span>
        <span className="bold" style={{ color: 'var(--blue-600)' }}>スコア +{SELF_REWARD.sp} / EXP +{SELF_REWARD.exp} / {CATEGORY_TO_STAT[category]} +{SELF_REWARD.statAmount}</span>
      </div>

      <button className="btn-primary" style={{ marginTop: 12 }} disabled={!title.trim()} onClick={submit}>
        達成を記録する
      </button>
    </>
  )
}
