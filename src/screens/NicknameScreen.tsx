import { useState } from 'react'
import { useApp } from '../store'
import { FACULTIES, ENROLLMENT_YEARS } from '../data/kindai'
import { startBgm } from '../lib/sound'

export function NicknameScreen() {
  const { register } = useApp()
  const [name, setName] = useState('')
  const [faculty, setFaculty] = useState('')
  const [year, setYear] = useState('')
  const trimmed = name.trim()
  const ok = trimmed.length >= 1 && trimmed.length <= 12
  const start = () => {
    // 「はじめる」＝最初のユーザー操作。ここでBGMを開始し、チュートリアルから流れるようにする
    startBgm()
    register(trimmed, faculty ? Number(faculty) : null, year ? Number(year) : null)
  }

  const selectStyle = {
    width: '100%', border: '1px solid var(--line)', borderRadius: 12,
    padding: '12px', fontSize: 15, fontFamily: 'inherit', background: '#f8fafc', color: 'var(--ink)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'center', gap: 8 }}>
      <div className="center" style={{ fontSize: 46 }}>🌱</div>
      <h1 className="center" style={{ fontSize: 24, margin: '4px 0' }}>KINDAI GROWTH</h1>
      <p className="center muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
        努力を記録して、レベル・ステータス・ランキングで<br />成長を見える化するアプリ（検証版）
      </p>

      <div className="section-card" style={{ marginTop: 18 }}>
        <div className="section-title" style={{ margin: '0 0 8px' }}>ニックネームを決めよう</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：くまさん（1〜12文字）"
          maxLength={12}
          style={{
            width: '100%', border: '1px solid var(--line)', borderRadius: 12,
            padding: '13px 12px', fontSize: 16, fontFamily: 'inherit', background: '#f8fafc',
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) start() }}
        />

        <div className="section-title" style={{ margin: '16px 0 8px', fontSize: 13 }}>学部・入学年度 <span className="muted" style={{ fontWeight: 600 }}>（任意）</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={faculty} onChange={(e) => setFaculty(e.target.value)} style={selectStyle} aria-label="学部">
            <option value="">学部を選択</option>
            {FACULTIES.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={selectStyle} aria-label="入学年度">
            <option value="">入学年度</option>
            {ENROLLMENT_YEARS.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>

        <p className="hint" style={{ marginTop: 8 }}>
          ※ ランキングに表示される名前です。本名・メール・電話番号は不要です。<br />
          ※ 学部・入学年度は近大内の匿名集計にのみ使い、個人が特定される形では公開しません。
        </p>
        <button className="btn-primary" style={{ marginTop: 12 }} disabled={!ok} onClick={start}>
          はじめる
        </button>
      </div>

      <p className="center hint">ランキング検証用プロトタイプ ・ 約1〜2週間の利用にご協力ください</p>
    </div>
  )
}
