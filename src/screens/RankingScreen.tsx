import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { fetchRankingBoard, type RankRow, type RankRowRanked } from '../lib/api'
import { isSupabaseEnabled } from '../lib/supabase'
import type { Route } from '../App'

interface Row extends RankRowRanked {
  isMe: boolean
}
interface Board {
  top: Row[]
  around: Row[]
  total: number
  myRank: number
  source: 'supabase' | 'local'
}

export function RankingScreen({ go }: { go: (r: Route) => void }) {
  const { state } = useApp()
  const me = state.user
  const [board, setBoard] = useState<Board | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      // 自分の最新ローカル値（反映ラグ対策で表示を上書き）
      const localMe = { nickname: me.name || 'あなた', level: me.level, totalScore: me.sp, avatar: me.avatar, stats: me.stats }
      const withMe = (r: Row): Row => (r.isMe ? { ...r, ...localMe } : r)

      const b = isSupabaseEnabled && me.userId ? await fetchRankingBoard(me.userId) : null
      if (b) {
        const mark = (r: RankRowRanked): Row => ({ ...r, isMe: r.userId === me.userId })
        let top = b.top.map(mark).map(withMe)
        let around = b.around.map(mark).map(withMe)
        let total = b.total
        let myRank = b.myRank ?? total + 1
        // 自分がまだ集計に載っていない場合（登録直後など）は末尾に補完
        if (!b.top.some((r) => r.userId === me.userId) && !b.around.some((r) => r.userId === me.userId)) {
          total = b.myRank ? total : total + 1
          const meRow: Row = { ...localMe, userId: me.userId, rank: myRank, isMe: true } as Row
          around = [...around, meRow]
        }
        if (alive) setBoard({ top, around, total, myRank, source: 'supabase' })
        return
      }

      // フォールバック：ローカルのダミー母集団＋自分
      const dummies: RankRow[] = state.ranking.map((u) => ({ userId: u.id, nickname: u.name, level: u.level, totalScore: u.monthlySP }))
      const meRow: RankRow = { userId: me.userId || 'me', nickname: me.name || 'あなた', level: me.level, totalScore: me.sp, avatar: me.avatar, exp: me.exp, stats: me.stats }
      const ranked: Row[] = [...dummies, meRow]
        .sort((a, b2) => b2.totalScore - a.totalScore)
        .map((r, i) => ({ ...r, rank: i + 1, isMe: r.userId === me.userId }))
      const myRank = ranked.find((r) => r.isMe)?.rank ?? ranked.length
      const from = Math.max(0, myRank - 1 - 5)
      const to = Math.min(ranked.length, myRank - 1 + 5 + 1)
      if (alive) setBoard({ top: ranked.slice(0, 50), around: ranked.slice(from, to), total: ranked.length, myRank, source: 'local' })
    }
    load()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.userId, me.sp, me.level, me.name])

  if (!board) {
    return (
      <>
        <PageHead title="ランキング" />
        <p className="center muted" style={{ marginTop: 40 }}>読み込み中…</p>
      </>
    )
  }

  const { top, around, total, myRank, source } = board
  const percentile = total > 0 ? Math.max(1, Math.round((myRank / total) * 100)) : 100
  const top3 = top.slice(0, 3)
  const top10 = top.slice(0, 10)

  const colorOf = (r: Row) => {
    const palette = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185']
    return r.isMe ? '#2563eb' : palette[(r.nickname.charCodeAt(0) + r.level) % palette.length]
  }

  const openProfile = (r: Row) => go({ name: 'profile', user: r, rank: r.rank, total, isMe: r.isMe })

  return (
    <div className="rank-theme">
      <PageHead title="ランキング" />

      {/* 自分の順位サマリ */}
      <div className="section-card rank-summary">
        <div className="row between">
          <div>
            <div className="rs-label">あなたの順位</div>
            <div className="rs-num" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>
              {myRank}<span style={{ fontSize: 15, fontWeight: 700 }}>位 / {total}人中</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="rs-label">上位</div>
            <div className="rs-num" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>{percentile}<span style={{ fontSize: 15, fontWeight: 700 }}>%</span></div>
          </div>
        </div>
        <div className="rs-sub" style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>累計スコア {me.sp.toLocaleString()} pt ・ Lv.{me.level}</div>
      </div>

      {/* 表彰台（上位3人） */}
      {top3.length === 3 && (
        <div className="podium">
          <PodiumCol r={top3[1]} place={2} color={colorOf(top3[1])} onOpen={openProfile} />
          <PodiumCol r={top3[0]} place={1} color={colorOf(top3[0])} onOpen={openProfile} />
          <PodiumCol r={top3[2]} place={3} color={colorOf(top3[2])} onOpen={openProfile} />
        </div>
      )}

      <div className="section-title">🏆 上位10人</div>
      {top10.map((r) => (
        <RankLine key={'top' + r.userId} r={r} color={colorOf(r)} onOpen={openProfile} />
      ))}

      <div className="section-title">🎯 あなたの周辺（前後5人）</div>
      {around.map((r) => (
        <RankLine key={'near' + r.userId} r={r} color={colorOf(r)} onOpen={openProfile} />
      ))}

      <p className="hint center" style={{ marginTop: 4 }}>名前をタップすると相手のプロフィールを見られます 👀</p>

      <p className="hint center">
        累計スコア（努力の合計）で全員をランキング。{source === 'local' ? '※現在はローカル表示（Supabase未接続）。' : '近大生みんなで競争中！'} 上を目指して続けよう 💪
      </p>
    </div>
  )
}

function RankAvatar({ r, color, size }: { r: Row; color: string; size: number }) {
  const [err, setErr] = useState(false)
  if (r.avatar && !err) {
    return (
      <div className="rank-av rank-av-img" style={{ width: size, height: size }}>
        <img src={'/' + r.avatar} alt={r.nickname} onError={() => setErr(true)} />
      </div>
    )
  }
  return (
    <div className="rank-av" style={{ background: color, width: size, height: size }}>{r.isMe ? '自' : r.nickname[0]}</div>
  )
}

function RankLine({ r, color, onOpen }: { r: Row; color: string; onOpen: (r: Row) => void }) {
  return (
    <button className={'rank-row rank-row-btn' + (r.isMe ? ' me' : '')} onClick={() => onOpen(r)}>
      <div className="rank-no">{r.rank}</div>
      <RankAvatar r={r} color={color} size={40} />
      <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
        <div className="rank-name">{r.isMe ? `${r.nickname || 'あなた'}（あなた）` : r.nickname} <span className="muted" style={{ fontSize: 11 }}>Lv.{r.level}</span></div>
        <div className="rank-fac">累計スコア</div>
      </div>
      <div className="rank-sp">{r.totalScore.toLocaleString()}<small> pt</small></div>
      <span className="rank-chevron">›</span>
    </button>
  )
}

function PodiumCol({ r, place, color, onOpen }: { r: Row; place: number; color: string; onOpen: (r: Row) => void }) {
  const medal = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉'
  return (
    <button className="col col-btn" onClick={() => onOpen(r)}>
      <div style={{ fontSize: 18 }}>{medal}</div>
      <RankAvatar r={r} color={color} size={place === 1 ? 62 : 54} />
      <div className="pname">{r.isMe ? 'あなた' : r.nickname}</div>
      <div className="psp">{r.totalScore.toLocaleString()} pt</div>
      <div className={`stand stand-${place}`}>{place}</div>
    </button>
  )
}
