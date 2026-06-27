import { useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import type { RankUser } from '../data/types'

const FACULTIES = ['全体', '経済学部', '経営学部', '文芸学部', '理工学部', '農学部']

export function RankingScreen() {
  const { rankingWith, friendRanking } = useApp()
  const [mode, setMode] = useState<'friend' | 'univ'>('univ')
  const [scope, setScope] = useState<'weekly' | 'monthly'>('weekly')
  const [faculty, setFaculty] = useState('全体')

  const list: RankUser[] = mode === 'friend' ? friendRanking() : rankingWith(scope, faculty)
  const key = scope === 'weekly' ? 'weeklySP' : 'monthlySP'
  const top3 = list.slice(0, 3)
  const rest = list.slice(3)
  const myRank = list.findIndex((u) => u.isMe) + 1

  const colorOf = (u: RankUser) => {
    const palette = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185']
    return u.isMe ? '#2563eb' : palette[(u.name.charCodeAt(0) + u.level) % palette.length]
  }

  return (
    <>
      <PageHead title="ランキング" />

      <div className="tab-row">
        <button className={mode === 'univ' ? 'active' : ''} onClick={() => setMode('univ')}>🏛️ 近畿大学</button>
        <button className={mode === 'friend' ? 'active' : ''} onClick={() => setMode('friend')}>👥 フレンド</button>
      </div>

      <div className="tab-row" style={{ background: 'transparent', padding: 0, marginTop: 10, gap: 8 }}>
        <button className={scope === 'weekly' ? 'active' : ''} style={chip(scope === 'weekly')} onClick={() => setScope('weekly')}>週間</button>
        <button className={scope === 'monthly' ? 'active' : ''} style={chip(scope === 'monthly')} onClick={() => setScope('monthly')}>月間</button>
      </div>

      {mode === 'univ' && (
        <div className="fac-row">
          {FACULTIES.map((f) => (
            <button key={f} className={'fac-chip' + (faculty === f ? ' active' : '')} onClick={() => setFaculty(f)}>{f}</button>
          ))}
        </div>
      )}

      {/* 表彰台 */}
      {top3.length === 3 && (
        <div className="podium">
          <PodiumCol u={top3[1]} place={2} color={colorOf(top3[1])} sp={top3[1][key]} />
          <PodiumCol u={top3[0]} place={1} color={colorOf(top3[0])} sp={top3[0][key]} />
          <PodiumCol u={top3[2]} place={3} color={colorOf(top3[2])} sp={top3[2][key]} />
        </div>
      )}

      {/* 自分の順位サマリ */}
      <div className="rank-row me" style={{ marginTop: 4 }}>
        <div className="rank-no">{myRank}位</div>
        <div className="rank-av" style={{ background: '#2563eb' }}>自</div>
        <div>
          <div className="rank-name">あなたの順位</div>
          <div className="rank-fac">SP（{scope === 'weekly' ? '週間' : '月間'}）でランクイン</div>
        </div>
        <div className="rank-sp">{(list.find((u) => u.isMe)?.[key] ?? 0).toLocaleString()}<small> SP</small></div>
      </div>

      {/* 4位以降 */}
      <div style={{ marginTop: 12 }}>
        {rest.map((u, i) => (
          <div key={u.id} className={'rank-row' + (u.isMe ? ' me' : '')}>
            <div className="rank-no">{i + 4}</div>
            <div className="rank-av" style={{ background: colorOf(u) }}>{u.name[0]}</div>
            <div>
              <div className="rank-name">{u.isMe ? `${u.name}（あなた）` : u.name} <span className="muted" style={{ fontSize: 11 }}>Lv.{u.level}</span></div>
              <div className="rank-fac">{u.faculty}</div>
            </div>
            <div className="rank-sp">{u[key].toLocaleString()}<small> SP</small></div>
          </div>
        ))}
      </div>

      <p className="hint center">SP（努力スコア）= 記録した努力量。{mode === 'friend' ? 'フレンドと週間で競争' : '学内・学部別で競争'}。今週も上を目指そう 💪</p>
    </>
  )
}

function chip(active: boolean): React.CSSProperties {
  return {
    flex: 'none',
    padding: '7px 16px',
    borderRadius: 999,
    border: '1px solid var(--line)',
    background: active ? 'var(--blue-600)' : '#fff',
    color: active ? '#fff' : 'var(--ink-soft)',
    fontWeight: 800,
    fontSize: 13,
  }
}

function PodiumCol({ u, place, color, sp }: { u: RankUser; place: number; color: string; sp: number }) {
  const medal = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉'
  return (
    <div className="col">
      <div style={{ fontSize: 18 }}>{medal}</div>
      <div className="pavatar" style={{ background: color, width: place === 1 ? 62 : 54, height: place === 1 ? 62 : 54 }}>
        {u.isMe ? '自' : u.name[0]}
      </div>
      <div className="pname">{u.isMe ? 'あなた' : u.name}</div>
      <div className="psp">{sp.toLocaleString()} SP</div>
      <div className={`stand stand-${place}`}>{place}</div>
    </div>
  )
}
