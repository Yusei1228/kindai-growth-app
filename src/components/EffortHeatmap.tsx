import { useMemo, useRef, useState } from 'react'
import type { ActivityLog } from '../data/types'
import { appDate } from '../lib/appDate'

// ===== がんばりカレンダー（月別ヒートマップ）=====
// 1か月ごとのカレンダーで日別の獲得SPを濃淡表示。頑張った日ほど濃い緑。
// 左右のスライド（矢印 or スワイプ）で前月をさかのぼって振り返れる。
// すべて端末内のログから算出（ネットワーク/DBなし）→ 6000人でもサーバー負荷ゼロ。

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 1日の獲得SPを 0〜4 の濃さレベルに変換 */
function levelOf(sp: number): number {
  if (sp <= 0) return 0
  if (sp < 60) return 1
  if (sp < 150) return 2
  if (sp < 300) return 3
  return 4
}

export function EffortHeatmap({ logs }: { logs: ActivityLog[] }) {
  const [offset, setOffset] = useState(0) // 0=今月, -1=先月, ...
  const dirRef = useRef<'prev' | 'next'>('prev')
  const touchX = useRef<number | null>(null)

  // 日付キー(app_date) → 合計SP
  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of logs) m.set(l.date, (m.get(l.date) ?? 0) + l.spEarned)
    return m
  }, [logs])

  // さかのぼれる下限（最古のログの月まで）
  const minOffset = useMemo(() => {
    if (!logs.length) return 0
    let min = logs[0].date
    for (const l of logs) if (l.date < min) min = l.date
    const [my, mm] = min.split('-').map(Number)
    const [cy, cm] = appDate().split('-').map(Number)
    return -((cy - my) * 12 + (cm - mm))
  }, [logs])

  const today = appDate()

  // 表示する月のカレンダーを構築
  const cal = useMemo(() => {
    const [ty, tm] = today.split('-').map(Number)
    const base = new Date(ty, tm - 1, 1)
    base.setMonth(base.getMonth() + offset)
    const Y = base.getFullYear()
    const M = base.getMonth() // 0-based
    const startDow = new Date(Y, M, 1).getDay()
    const daysInMonth = new Date(Y, M + 1, 0).getDate()

    const cells: ({ day: number; key: string; sp: number; level: number; future: boolean } | null)[] = []
    for (let i = 0; i < startDow; i++) cells.push(null) // 月初までの空白
    let monthSp = 0
    let activeDays = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const key = appDate(new Date(Y, M, day, 12))
      const future = key > today
      const sp = byDate.get(key) ?? 0
      if (!future && sp > 0) { monthSp += sp; activeDays++ }
      cells.push({ day, key, sp, level: future ? -1 : levelOf(sp), future })
    }
    while (cells.length % 7 !== 0) cells.push(null) // 週末までの空白

    return { Y, M, cells, monthSp, activeDays }
  }, [offset, byDate, today])

  const go = (d: 'prev' | 'next') => {
    dirRef.current = d
    setOffset((o) => {
      const next = d === 'prev' ? o - 1 : o + 1
      return Math.min(0, Math.max(minOffset, next))
    })
  }
  const canPrev = offset > minOffset
  const canNext = offset < 0

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (dx > 45 && canPrev) go('prev') // 右スワイプ→前月
    else if (dx < -45 && canNext) go('next') // 左スワイプ→翌月
  }

  return (
    <div className="hm">
      <div className="hm-head">
        <button className="hm-nav" onClick={() => go('prev')} disabled={!canPrev} aria-label="前の月" data-sound="slide">‹</button>
        <div className="hm-title">{cal.Y}年{cal.M + 1}月</div>
        <button className="hm-nav" onClick={() => go('next')} disabled={!canNext} aria-label="次の月" data-sound="slide">›</button>
      </div>

      <div className="hm-cal-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="hm-dow">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className={i === 0 ? 'sun' : i === 6 ? 'sat' : ''}>{w}</span>
          ))}
        </div>
        <div className={'hm-cal ' + (dirRef.current === 'prev' ? 'in-prev' : 'in-next')} key={offset}>
          {cal.cells.map((c, i) =>
            c === null ? (
              <span className="hm-d empty" key={i} />
            ) : (
              <span
                className={'hm-d' + (c.future ? ' fut' : '')}
                data-lv={c.future ? undefined : c.level}
                key={i}
                title={c.future ? undefined : `${c.key}・${c.sp}SP`}
              >
                {c.day}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="hm-foot">
        <span className="muted" style={{ fontSize: 11 }}>
          {cal.activeDays > 0 ? `この月 ${cal.activeDays}日活動・${cal.monthSp}SP` : 'この月の記録はまだありません'}
        </span>
        <div className="hm-legend">
          少
          <i data-lv={0} /><i data-lv={1} /><i data-lv={2} /><i data-lv={3} /><i data-lv={4} />
          多
        </div>
      </div>
    </div>
  )
}
