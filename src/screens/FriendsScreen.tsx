import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import {
  syncMyProfile,
  friendsAvailable,
  friendRanking,
  listIncoming,
  respondRequest,
  sendRequestByCode,
  sendRequestToUser,
  pingLocation,
  recentEncounters,
  footprints as fetchFootprints,
  type FriendUser,
  type IncomingRequest,
  type Encounter,
} from '../lib/friends'

type Tab = 'friends' | 'requests' | 'nearby' | 'foot'

export function FriendsScreen({ back, notify }: { back: () => void; notify: (m: string) => void }) {
  const { state } = useApp()
  const me = state.user
  const [tab, setTab] = useState<Tab>('friends')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [myCode, setMyCode] = useState<string>('')
  const [ranking, setRanking] = useState<(FriendUser & { isMe?: boolean })[]>([])
  const [incoming, setIncoming] = useState<IncomingRequest[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [foot, setFoot] = useState<Encounter[]>([])
  const [codeInput, setCodeInput] = useState('')
  const [sharing, setSharing] = useState(false)
  const [locErr, setLocErr] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  const refreshAll = async () => {
    setRanking(await friendRanking())
    setIncoming(await listIncoming())
    setFoot(await fetchFootprints())
    setEncounters(await recentEncounters(60))
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      const ok = await friendsAvailable()
      if (!alive) return
      setAvailable(ok)
      const code = await syncMyProfile({ nickname: me.name || 'あなた', avatar: me.avatar, level: me.level, totalScore: me.sp })
      if (alive && code) setMyCode(code)
      if (alive) await refreshAll()
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 現在地共有：オプトイン。有効な間だけ位置を送信し、すれ違いを更新。
  useEffect(() => {
    if (!sharing) {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    const tick = () => {
      const done = (lat: number, lng: number) => {
        pingLocation(lat, lng).then(async () => setEncounters(await recentEncounters(60)))
      }
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocErr(null)
            done(pos.coords.latitude, pos.coords.longitude)
          },
          () => {
            // 位置が取れない環境ではデモとして擬似すれ違い
            setLocErr('位置情報が使えないため、デモとしてすれ違いを表示します')
            done(0, 0)
          },
          { enableHighAccuracy: false, maximumAge: 30000, timeout: 8000 },
        )
      } else {
        done(0, 0)
      }
    }
    tick()
    pollRef.current = window.setInterval(tick, 45000) as unknown as number
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [sharing])

  const onSendByCode = async () => {
    const code = codeInput.trim()
    if (!code) return
    const r = await sendRequestByCode(code)
    if (r.ok) {
      notify('フレンド申請を送りました！')
      setCodeInput('')
    } else notify(r.error || '申請に失敗しました')
  }
  const onRespond = async (id: string, accept: boolean) => {
    await respondRequest(id, accept)
    notify(accept ? 'フレンドになりました🎉' : '申請を辞退しました')
    await refreshAll()
  }
  const onRequestEncounter = async (u: Encounter) => {
    const r = await sendRequestToUser(u.userId)
    if (r.ok) {
      notify(`${u.nickname} さんに申請を送りました！`)
      setEncounters(await recentEncounters(60))
    } else notify(r.error || '申請に失敗しました')
  }

  return (
    <>
      <PageHead title="フレンド" onBack={back} />

      {available === false && (
        <div className="info-note" style={{ marginTop: 10 }}>ⓘ 現在はデモ表示です（サーバー未接続）。実際の申請・すれ違いは、公開版で動作します。</div>
      )}

      {/* 自分のフレンドID */}
      <div className="fr-mycode">
        <div>
          <div className="fr-mycode-lab">あなたのフレンドID</div>
          <div className="fr-mycode-val">{myCode || '―'}</div>
        </div>
        <button
          className="fr-copy"
          onClick={() => {
            if (!myCode) return
            navigator.clipboard?.writeText(myCode).then(() => notify('IDをコピーしました')).catch(() => {})
          }}
        >
          コピー
        </button>
      </div>

      {/* タブ */}
      <div className="fr-tabs">
        {([
          ['friends', 'ランキング', 0],
          ['requests', '申請', incoming.length],
          ['nearby', 'すれ違い', 0],
          ['foot', '足跡', 0],
        ] as [Tab, string, number][]).map(([k, label, badge]) => (
          <button key={k} className={'fr-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)} data-sound="tap">
            {label}
            {badge > 0 && <span className="fr-tab-badge">{badge}</span>}
          </button>
        ))}
      </div>

      {/* フレンドランキング */}
      {tab === 'friends' && (
        <div>
          {ranking.length <= 1 ? (
            <p className="hint center" style={{ marginTop: 20 }}>まだフレンドがいません。IDで申請するか、すれ違いから追加しよう！</p>
          ) : (
            ranking.map((u, i) => (
              <div key={u.userId} className={'fr-rank-row' + (u.isMe ? ' me' : '')}>
                <div className="fr-rank-no">{i + 1}</div>
                <FriendAvatar u={u} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fr-name">{u.isMe ? `${u.nickname}（あなた）` : u.nickname} <span className="muted" style={{ fontSize: 11 }}>Lv.{u.level}</span></div>
                  <div className="fr-sub">累計スコア</div>
                </div>
                <div className="fr-score">{u.totalScore.toLocaleString()}<small> pt</small></div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 申請（ID申請＋受信一覧） */}
      {tab === 'requests' && (
        <div>
          <div className="section-card" style={{ marginTop: 12 }}>
            <div className="bold" style={{ fontSize: 15 }}>🔎 IDでフレンド申請</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>相手の6桁フレンドIDを入力してください。</div>
            <input
              className="fr-input"
              style={{ width: '100%', marginTop: 12 }}
              placeholder="例：AB12CD"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              inputMode="text"
              autoCapitalize="characters"
            />
            <button className="btn-primary fr-send-btn" onClick={onSendByCode} disabled={codeInput.trim().length < 4}>この人に申請する</button>
          </div>

          <div className="section-title">届いた申請{incoming.length > 0 ? `（${incoming.length}）` : ''}</div>
          {incoming.length === 0 ? (
            <p className="hint center">今は届いている申請はありません。</p>
          ) : (
            incoming.map((r) => (
              <div key={r.id} className="fr-req-row">
                <FriendAvatar u={r.from} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fr-name">{r.from.nickname} <span className="muted" style={{ fontSize: 11 }}>Lv.{r.from.level}</span></div>
                  <div className="fr-sub">フレンド申請が届いています</div>
                </div>
                <button className="fr-accept" onClick={() => onRespond(r.id, true)}>承認</button>
                <button className="fr-decline" onClick={() => onRespond(r.id, false)}>×</button>
              </div>
            ))
          )}
        </div>
      )}

      {/* すれ違い（現在地共有→近くの人→10分以内申請） */}
      {tab === 'nearby' && (
        <div>
          <div className="section-card" style={{ marginTop: 12 }}>
            <div className="row between">
              <div>
                <div className="bold" style={{ fontSize: 14 }}>📍 現在地を共有してすれ違いを探す</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>約100mの粗い位置だけを使い、短時間で自動削除。すれ違った人には<b>10分以内</b>だけ申請できます。</div>
              </div>
              <button className={'fr-switch' + (sharing ? ' on' : '')} onClick={() => setSharing((v) => !v)} role="switch" aria-checked={sharing}>
                <span className="fr-knob" />
              </button>
            </div>
            {locErr && <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>{locErr}</div>}
          </div>

          <div className="section-title">近くですれ違った人</div>
          {encounters.length === 0 ? (
            <p className="hint center">{sharing ? '探しています…すれ違うと、ここに表示されます。' : '上のスイッチをONにして、すれ違いを探そう。'}</p>
          ) : (
            encounters.map((u) => (
              <div key={u.userId} className="fr-req-row">
                <FriendAvatar u={u} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fr-name">{u.nickname} <span className="muted" style={{ fontSize: 11 }}>Lv.{u.level}</span></div>
                  <div className="fr-sub">{u.canRequest ? '✨ たった今すれ違いました' : 'すれ違い（10分経過）'}</div>
                </div>
                {u.status === 'friend' ? (
                  <span className="fr-tagmini">フレンド</span>
                ) : u.status === 'requested' ? (
                  <span className="fr-tagmini">申請済み</span>
                ) : (
                  <button className="fr-accept" disabled={!u.canRequest} onClick={() => onRequestEncounter(u)}>申請</button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 足跡（すれ違い履歴） */}
      {tab === 'foot' && (
        <div>
          <div className="section-title" style={{ marginTop: 12 }}>👣 すれ違った足跡</div>
          {foot.length === 0 ? (
            <p className="hint center">まだ足跡はありません。すれ違いをONにして出かけよう。</p>
          ) : (
            foot.map((u, i) => (
              <div key={u.userId + i} className="fr-foot-row">
                <FriendAvatar u={u} small />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fr-name" style={{ fontSize: 14 }}>{u.nickname} <span className="muted" style={{ fontSize: 11 }}>Lv.{u.level}</span></div>
                </div>
                <div className="fr-foot-date">{fmtWhen(u.at)}</div>
              </div>
            ))
          )}
          <p className="hint center" style={{ marginTop: 10 }}>足跡は記録として残りますが、申請できるのはすれ違いから10分以内だけです。</p>
        </div>
      )}
    </>
  )
}

function FriendAvatar({ u, small }: { u: { avatar?: string | null; nickname: string; isMe?: boolean }; small?: boolean }) {
  const [err, setErr] = useState(false)
  const size = small ? 34 : 42
  const palette = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185']
  const color = u.isMe ? '#2563eb' : palette[(u.nickname.charCodeAt(0) || 0) % palette.length]
  if (u.avatar && !err) {
    return <div className="fr-av" style={{ width: size, height: size }}><img src={'/' + u.avatar} alt={u.nickname} onError={() => setErr(true)} /></div>
  }
  return <div className="fr-av" style={{ width: size, height: size, background: color, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{u.isMe ? '自' : u.nickname[0]}</div>
}

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}
