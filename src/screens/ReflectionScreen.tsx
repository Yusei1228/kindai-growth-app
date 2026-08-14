import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { CATEGORY_TO_STAT, type Category } from '../data/types'
import { aggregateByItem } from '../lib/activity'

const CAT_EMOJI: Record<Category, string> = { 勉強: '📘', 運動: '❤️', 生活習慣: '⚡', 振り返り: '✨' }
// カテゴリ配色（アイコン背景 / 文字・バー色）
const CAT_COLORS: Record<Category, [string, string]> = {
  勉強: ['#e2ecfb', '#2563eb'],
  運動: ['#fde7ef', '#ec4899'],
  生活習慣: ['#fff0db', '#f59e0b'],
  振り返り: ['#fbe8fb', '#d946ef'],
}

type Period = 'week' | 'month'
const DAY = 86400000

export function ReflectionScreen() {
  const { state } = useApp()
  const logs = state.logs
  const [period, setPeriod] = useState<Period>('week')

  // ---- 期間フィルタ（すべて端末内の自分のログのみ・軽量） ----
  const rangeDays = period === 'week' ? 7 : 30
  const periodLogs = useMemo(() => {
    const from = Date.now() - rangeDays * DAY
    return logs.filter((l) => l.at >= from)
  }, [logs, rangeDays])

  // ---- KPI ----
  const kpi = useMemo(() => {
    let sp = 0, min = 0
    for (const l of periodLogs) { sp += l.spEarned; min += l.minutes }
    return { sp, min, count: periodLogs.length }
  }, [periodLogs])

  // ---- 8項目の内訳 ----
  const aggs = useMemo(() => aggregateByItem(periodLogs), [periodLogs])
  const eight = aggs.filter((a) => a.item.id !== 'other')
  const other = aggs.find((a) => a.item.id === 'other' && a.count > 0)
  const done = eight
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count || b.minutes - a.minutes)
  const missing = eight.filter((a) => a.count === 0)
  const maxCount = Math.max(1, ...done.map((a) => a.count))

  // ---- 自動インサイト（何を頑張った / 何が足りない） ----
  const periodLabel = period === 'week' ? '今週' : '今月'
  const insight = (() => {
    if (kpi.count === 0) return null
    const top = done[0]
    const missNames = missing.slice(0, 3).map((a) => a.item.title).join('・')
    return { topTitle: top.item.title, topCount: top.count, missNames, missMore: missing.length > 3, allDone: missing.length === 0 }
  })()

  // ---- 推移グラフ（週=日別7本 / 月=週別4本） ----
  const trend = useMemo(() => {
    if (period === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        const key = d.toISOString().slice(0, 10)
        const sp = logs.filter((l) => l.date === key).reduce((s, l) => s + l.spEarned, 0)
        return { label: ['日', '月', '火', '水', '木', '金', '土'][d.getDay()], sp }
      })
    }
    return Array.from({ length: 4 }, (_, i) => {
      const bucket = 3 - i // i=0→3週前(左) … i=3→今週(右)
      const from = Date.now() - (bucket + 1) * 7 * DAY
      const to = Date.now() - bucket * 7 * DAY
      const sp = logs.filter((l) => l.at >= from && l.at < to).reduce((s, l) => s + l.spEarned, 0)
      return { label: bucket === 0 ? '今週' : `${bucket}週前`, sp }
    })
  }, [logs, period])
  const maxSp = Math.max(60, ...trend.map((d) => d.sp))

  return (
    <>
      <PageHead title="振り返り" />

      {/* 期間の切り替え */}
      <div className="seg-toggle" role="tablist">
        <button role="tab" aria-selected={period === 'week'} className={period === 'week' ? 'on' : ''} onClick={() => setPeriod('week')}>過去1週間</button>
        <button role="tab" aria-selected={period === 'month'} className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>過去1カ月</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="lab">{periodLabel}のSP</div><div className="num" style={{ color: 'var(--blue-600)' }}>{kpi.sp}</div></div>
        <div className="kpi"><div className="lab">記録回数</div><div className="num">{kpi.count}<span style={{ fontSize: 14 }}> 回</span></div></div>
        <div className="kpi"><div className="lab">合計時間</div><div className="num">{kpi.min}<span style={{ fontSize: 14 }}> 分</span></div></div>
        <div className="kpi"><div className="lab">連続日数</div><div className="num" style={{ color: '#f97316' }}>🔥{state.user.streak}</div></div>
      </div>

      {/* 自動インサイト */}
      {insight && (
        <div className="rf-insight">
          {periodLabel}いちばん頑張ったのは <b>{insight.topTitle}</b>（{insight.topCount}回）。{' '}
          {insight.allDone
            ? '8項目すべてに取り組めています。すばらしい！🎉'
            : <>あと <b>{insight.missNames}</b>{insight.missMore ? ' ほか' : ''} が未着手でした。</>}
        </div>
      )}

      {/* 8項目の内訳 */}
      <div className="section-title">取り組みの内訳（8項目）</div>
      <div className="section-card">
        {kpi.count === 0 && <p className="muted center" style={{ padding: 12 }}>{periodLabel}の記録はまだありません。<br />ミッションを1つやってみよう！</p>}

        {done.map((a) => {
          const [bg, color] = CAT_COLORS[a.item.category]
          return (
            <div className="rf-item" key={a.item.id}>
              <div className="rf-ico" style={{ background: bg, color }}>{a.item.emoji}</div>
              <div className="rf-main">
                <div className="rf-top">
                  <span className="rf-name">{a.item.title}</span>
                  <span className="rf-meta">{a.count}回{a.minutes > 0 ? `・${a.minutes}分` : ''}・{a.sp}SP</span>
                </div>
                <div className="rf-track"><i style={{ width: `${Math.max(8, (a.count / maxCount) * 100)}%`, background: color }} /></div>
                {a.lastComment && <div className="rf-comment">“{a.lastComment}”</div>}
              </div>
            </div>
          )
        })}

        {other && (
          <div className="rf-item">
            <div className="rf-ico" style={{ background: '#eef1f6', color: 'var(--ink-soft)' }}>📋</div>
            <div className="rf-main">
              <div className="rf-top">
                <span className="rf-name" style={{ color: 'var(--ink-soft)' }}>その他の記録</span>
                <span className="rf-meta">{other.count}回・{other.sp}SP</span>
              </div>
              <div className="rf-track"><i style={{ width: `${Math.max(8, (other.count / maxCount) * 100)}%`, background: '#9aa7bd' }} /></div>
            </div>
          </div>
        )}
      </div>

      {/* 足りなかったこと（未着手） */}
      {kpi.count > 0 && missing.length > 0 && (
        <>
          <div className="section-title">⚠️ {periodLabel}やれていないこと</div>
          <div className="section-card">
            <div className="rf-missing">
              {missing.map((a) => (
                <span className="rf-chip" key={a.item.id}><span className="e">{a.item.emoji}</span>{a.item.title}</span>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>次に取り組むと、伸びしろが大きい項目です 💪</p>
          </div>
        </>
      )}

      {/* 推移グラフ */}
      <div className="section-card">
        <div className="bold">{period === 'week' ? '日別' : '週別'}の獲得SP（努力量）</div>
        <div className="bars">
          {trend.map((d, i) => (
            <div className="b" key={i}>
              <i style={{ height: `${Math.max(4, (d.sp / maxSp) * 100)}%` }} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 最近の記録（直近に何をやったか一目でわかる履歴・全期間） */}
      <div className="section-title">最近の記録</div>
      <div className="section-card" style={{ paddingTop: 4 }}>
        {logs.length === 0 && <p className="muted center" style={{ padding: 16 }}>まだ記録がありません</p>}
        {logs.slice(0, 12).map((l) => (
          <div className="log-item" key={l.id}>
            <div className="log-cat" style={catStyle(l.category)}>{CAT_EMOJI[l.category]}</div>
            <div style={{ flex: 1 }}>
              <div className="bold" style={{ fontSize: 14 }}>{l.missionTitle}</div>
              <div className="muted" style={{ fontSize: 11 }}>{l.date}・{l.minutes}分・{CATEGORY_TO_STAT[l.category]}+ {'★'.repeat(l.rating)}</div>
              {l.comment && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>“{l.comment}”</div>}
            </div>
            <div className="rank-sp" style={{ fontSize: 14 }}>+{l.spEarned}<small> SP</small></div>
          </div>
        ))}
      </div>
    </>
  )
}

function catStyle(cat: Category): React.CSSProperties {
  const [bg, color] = CAT_COLORS[cat]
  return { background: bg, color }
}
