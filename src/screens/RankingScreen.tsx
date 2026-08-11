import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { fetchRanking, type RankRow } from '../lib/api'
import { isSupabaseEnabled } from '../lib/supabase'
import type { Route } from '../App'

interface Row extends RankRow {
  rank: number
  isMe: boolean
}

export function RankingScreen({ go }: { go: (r: Route) => void }) {
  const { state } = useApp()
  const me = state.user
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<'supabase' | 'local'>('local')

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      let list: RankRow[] | null = null
      if (isSupabaseEnabled) list = await fetchRanking()

      let src: 'supabase' | 'local' = 'supabase'
      if (!list) {
        // フォールバック: ローカルのダミー母集団＋自分（Supabase未設定時のUI確認用）
        src = 'local'
        list = localFallback()
      } else {
        // 自分の最新値（アバター・ステータス含む）
        const mine: RankRow = {
          userId: me.userId,
          nickname: me.name || 'あなた',
          level: me.level,
          totalScore: me.sp,
          avatar: me.avatar,
          exp: me.exp,
          stats: me.stats,
        }
        // 自分がまだDBに無い場合に備えてマージ（登録直後など）
        if (!list.some((r) => r.userId === me.userId)) {
          list = [...list, mine]
        } else {
          // DBの自分の値をローカル最新に上書き（反映ラグ対策）
          list = list.map((r) => (r.userId === me.userId ? { ...r, ...mine } : r))
        }
      }

      const sorted = [...list].sort((a, b) => b.totalScore - a.totalScore)
      const ranked: Row[] = sorted.map((r, i) => ({ ...r, rank: i + 1, isMe: r.userId === me.userId }))
      if (alive) {
        setRows(ranked)
        setSource(src)
        setLoading(false)
      }
    }
    load()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.userId, me.sp, me.level, me.name])

  function localFallback(): RankRow[] {
    const dummies = state.ranking.map((u) => ({ userId: u.id, nickname: u.name, level: u.level, totalScore: u.monthlySP }))
    const meRow: RankRow = { userId: me.userId || 'me', nickname: me.name || 'あなた', level: me.level, totalScore: me.sp, avatar: me.avatar, exp: me.exp, stats: me.stats }
    return [...dummies, meRow]
  }

  if (loading || !rows) {
    return (
      <>
        <PageHead title="ランキング" />
        <p className="center muted" style={{ marginTop: 40 }}>読み込み中…</p>
      </>
    )
  }

  const total = rows.length
  const meRow = rows.find((r) => r.isMe)
  const myRank = meRow?.rank ?? total
  const percentile = Math.max(1, Math.round((myRank / total) * 100))
  const top3 = rows.slice(0, 3)
  const top10 = rows.slice(0, 10)

  // 自分の前後5人（自分中心の±5ウィンドウ）
  const from = Math.max(0, myRank - 1 - 5)
  const to = Math.min(total, myRank - 1 + 5 + 1)
  const around = rows.slice(from, to)

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
            <div style={{ fontSize: 12, opacity: 0.9 }}>あなたの順位</div>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>
              {myRank}<span style={{ fontSize: 15, fontWeight: 700 }}>位 / {total}人中</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>上位</div>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}>{percentile}<span style={{ fontSize: 15, fontWeight: 700 }}>%</span></div>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700 }}>累計スコア {me.sp.toLocaleString()} pt ・ Lv.{me.level}</div>
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
