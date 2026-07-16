import { useState } from 'react'
import { useApp } from '../store'

export function NicknameScreen() {
  const { register } = useApp()
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const ok = trimmed.length >= 1 && trimmed.length <= 12

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
          onKeyDown={(e) => { if (e.key === 'Enter' && ok) register(trimmed) }}
        />
        <p className="hint" style={{ marginTop: 8 }}>
          ※ ランキングに表示される名前です。本名・メール・電話番号は不要です。<br />
          ※ このニックネームで他の近大生と累計スコアを競います。
        </p>
        <button className="btn-primary" style={{ marginTop: 12 }} disabled={!ok} onClick={() => register(trimmed)}>
          はじめる
        </button>
      </div>

      <p className="center hint">ランキング検証用プロトタイプ ・ 約1〜2週間の利用にご協力ください</p>
    </div>
  )
}
