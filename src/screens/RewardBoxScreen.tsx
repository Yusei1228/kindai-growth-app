import { useEffect, useState } from 'react'
import { PageHead } from '../components/ui'
import { getRewardBox, claimReward, claimAllRewards, type RewardBoxItem } from '../lib/rewards'
import { playSound } from '../lib/sound'
import type { Route } from '../App'

function daysLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  const d = Math.ceil(ms / 86400000)
  return d <= 0 ? 'まもなく期限' : `${d}日後に期限`
}

export function RewardBoxScreen({ go, back }: { go: (r: Route) => void; back: () => void; notify: (m: string) => void }) {
  const [items, setItems] = useState<RewardBoxItem[] | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => setItems(await getRewardBox())
  useEffect(() => {
    load()
  }, [])

  const claimOne = async (id: string) => {
    setBusy(true)
    try {
      await claimReward(id)
      playSound('coin')
      await load()
    } finally {
      setBusy(false)
    }
  }
  const claimAll = async () => {
    if (busy || !items?.length) return
    setBusy(true)
    try {
      await claimAllRewards()
      playSound('reward')
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHead title="受け取りBOX" onBack={back} />
      <div className="row between" style={{ marginTop: 4 }}>
        <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          未受け取りの報酬が表示されます<br />期限を過ぎると受け取れなくなります
        </div>
        <button className="rw-claim-all" onClick={claimAll} disabled={busy || !items?.length}>一括受取</button>
      </div>

      {items === null && <p className="muted center" style={{ marginTop: 30 }}>読み込み中…</p>}
      {items?.length === 0 && (
        <div className="section-card center" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 34 }}>📭</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>受け取り待ちの報酬はありません。<br />ガチャを回して報酬を当てよう！</p>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px', marginTop: 12 }} onClick={() => go({ name: 'tickets' })}>ガチャへ</button>
        </div>
      )}

      {items?.map((it) => (
        <div className="rw-box-item" key={it.id}>
          <div className="rw-box-emoji">{it.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="rw-box-kind">{it.kind}</div>
            <div className="bold" style={{ fontSize: 15 }}>{it.title}</div>
            <div className="muted" style={{ fontSize: 11 }}>{it.description || it.sponsor_name}</div>
            <div className="rw-box-exp">🕒 {daysLeft(it.expires_at)}</div>
          </div>
          <button className="rw-claim-btn" onClick={() => claimOne(it.id)} disabled={busy}>受け取る</button>
        </div>
      ))}

      {!!items?.length && (
        <button className="btn-ghost" style={{ marginTop: 14 }} onClick={() => go({ name: 'my-coupons' })}>受け取ったクーポンを見る →</button>
      )}
    </>
  )
}
