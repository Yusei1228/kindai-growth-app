import { useState } from 'react'
import { PageHead } from '../components/ui'
import type { RankRow } from '../lib/api'
import type { Stats, StatKey } from '../data/types'

const STAT_META: { key: StatKey; ico: string; color: string }[] = [
  { key: '体力', ico: '❤️', color: '#ec4899' },
  { key: '知力', ico: '📘', color: '#2563eb' },
  { key: '活力', ico: '⚡', color: '#f59e0b' },
  { key: '魅力', ico: '✨', color: '#d946ef' },
]

function avatarColor(seed: string): string {
  const palette = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185']
  return palette[(seed.charCodeAt(0) || 0) % palette.length]
}

export function UserProfileScreen({
  user,
  rank,
  total,
  isMe,
  back,
}: {
  user: RankRow
  rank: number
  total: number
  isMe: boolean
  back: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const stats: Stats = user.stats ?? { 体力: 0, 知力: 0, 活力: 0, 魅力: 0 }
  const power = stats.体力 + stats.知力 + stats.活力 + stats.魅力
  const showImg = !!user.avatar && !imgError

  return (
    <>
      <PageHead title="プロフィール" onBack={back} />

      <div className="section-card center">
        <div className="up-avatar" style={{ background: showImg ? '#fff' : avatarColor(user.nickname) }}>
          {showImg ? (
            <img src={'/' + user.avatar} alt={user.nickname} onError={() => setImgError(true)} />
          ) : (
            <span className="up-avatar-initial">{user.nickname[0] ?? '？'}</span>
          )}
        </div>
        <div className="bold" style={{ fontSize: 22, marginTop: 10 }}>
          {user.nickname}
          {isMe && <span className="muted" style={{ fontSize: 14, fontWeight: 700 }}>（あなた）</span>}
        </div>
        <span className="lvl-tag" style={{ fontSize: 14 }}>Lv.{user.level}</span>

        <div className="up-kpi-row">
          <div className="up-kpi">
            <div className="lab">ランキング</div>
            <div className="num">{rank}<span className="u">位</span></div>
            <div className="sub">/ {total}人中</div>
          </div>
          <div className="up-kpi">
            <div className="lab">累計スコア</div>
            <div className="num">{user.totalScore.toLocaleString()}<span className="u">pt</span></div>
            <div className="sub">努力の合計</div>
          </div>
        </div>
      </div>

      <div className="section-title">ステータス</div>
      <div className="section-card">
        {STAT_META.map((s) => (
          <div key={s.key} style={{ marginBottom: 14 }}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <span className="row gap6">
                <span className="ico" style={{ width: 26, height: 26, fontSize: 13, background: s.color }}>{s.ico}</span>
                <span className="bold" style={{ fontSize: 14 }}>{s.key}</span>
              </span>
              <span className="bold">{stats[s.key]}<span className="muted" style={{ fontSize: 11 }}> /100</span></span>
            </div>
            <div className="progress-track"><i style={{ width: Math.min(100, stats[s.key]) + '%', background: s.color }} /></div>
          </div>
        ))}
        <div className="muted center" style={{ fontSize: 12, marginTop: 4 }}>総合力 {power}</div>
      </div>

      <p className="hint center">努力を記録して、みんなでランキングを競い合おう 💪</p>
    </>
  )
}
