import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { AVATARS } from '../data/avatars'

export function AvatarSelectScreen({ back, notify }: { back: () => void; notify: (m: string) => void }) {
  const { state, setAvatar } = useApp()
  const current = state.user.avatar
  // 読み込みに失敗した画像は候補から隠す
  const [missing, setMissing] = useState<Record<string, boolean>>({})

  const choose = (file: string) => {
    setAvatar(file)
    notify('アバターを変更しました')
  }

  const available = AVATARS.filter((a) => !missing[a.file])

  return (
    <>
      <PageHead title="アバターを選ぶ" onBack={back} />
      <p className="hint" style={{ marginTop: 4 }}>
        使いたいキャラクターをタップすると、ホームの画像が切り替わります。
      </p>

      <div className="avatar-grid">
        {AVATARS.map((a) => (
          <button
            key={a.file}
            className={'avatar-tile' + (current === a.file ? ' selected' : '') + (missing[a.file] ? ' missing' : '')}
            onClick={() => choose(a.file)}
            style={missing[a.file] ? { display: 'none' } : undefined}
          >
            <img
              src={'/' + a.file}
              alt={a.label}
              onError={() => setMissing((m) => ({ ...m, [a.file]: true }))}
            />
            {current === a.file && <span className="avatar-check">✓</span>}
            <span className="avatar-label">{a.label}</span>
          </button>
        ))}
      </div>

      {available.length === 0 && (
        <p className="hint center" style={{ marginTop: 16 }}>表示できるアバター画像がありません。</p>
      )}

      <div className="section-card" style={{ marginTop: 16 }}>
        <div className="bold" style={{ fontSize: 13, marginBottom: 6 }}>アバターを増やすには</div>
        <p className="hint" style={{ margin: 0 }}>
          アプリの <code>public/</code> フォルダに <code>avatar-2.png</code>, <code>avatar-3.png</code> …
          という名前で画像を追加すると、ここに選択肢が増えます（<code>hero-avatar.png</code> が1枚目）。
        </p>
      </div>
    </>
  )
}
