import { useMemo } from 'react'
import type { ActivityLog } from '../data/types'
import { appDate } from '../lib/appDate'

// ===== がんばりカレンダー（GitHub風ヒートマップ）=====
// 日別の獲得SPを濃淡で表示。頑張った日ほど濃い緑。
// すべて端末内のログから算出（ネットワーク/DBなし）→ 6000人でもサーバー負荷ゼロ。

const DAY = 86400000
const WEEKS = 18 // 表示する週数（約4カ月）

/** 1日の獲得SPを 0〜4 の濃さレベルに変換 */
function levelOf(sp: number): number {
  if (sp <= 0) return 0
  if (sp < 60) return 1
  if (sp < 150) return 2
  if (sp < 300) return 3
  return 4
}

const WEEKDAY_LABELS = ['', '月', '', '水', '', '金', ''] // 日曜始まり（Mon/Wed/Fri のみ表示）

export function EffortHeatmap({ logs }: { logs: ActivityLog[] }) {
  const { cols, monthCells, activeDays } = useMemo(() => {
    // 日付キー(app_date) → 合計SP
    const byDate = new Map<string, number>()
    for (const l of logs) byDate.set(l.date, (byDate.get(l.date) ?? 0) + l.spEarned)

    const anchor = new Date()
    anchor.setHours(12, 0, 0, 0) // 当日正午を基準（朝5時境界を避ける）
    const todayMs = anchor.getTime()
    const todayDow = anchor.getDay() // 0=日
    // 今週の日曜から (WEEKS-1) 週さかのぼった日曜を先頭にする
    const startMs = todayMs - (todayDow + (WEEKS - 1) * 7) * DAY

    let activeDays = 0
    const cols = Array.from({ length: WEEKS }, (_, w) => {
      const days = Array.from({ length: 7 }, (_, d) => {
        const cellDate = new Date(startMs + (w * 7 + d) * DAY)
        const key = appDate(cellDate)
        const future = cellDate.getTime() > todayMs
        const sp = byDate.get(key) ?? 0
        if (!future && sp > 0) activeDays++
        return { key, sp, level: future ? -1 : levelOf(sp) }
      })
      return { month: new Date(startMs + w * 7 * DAY).getMonth() + 1, days }
    })

    // 月が変わる列にだけ「N月」ラベルを出す
    const monthCells = cols.map((c, i) => (i === 0 || c.month !== cols[i - 1].month ? `${c.month}月` : ''))

    return { cols, monthCells, activeDays }
  }, [logs])

  return (
    <div className="hm">
      <div className="hm-wrap">
        <div className="hm-months">
          {monthCells.map((m, i) => (
            <span className="m" key={i}>{m}</span>
          ))}
        </div>
        <div className="hm-body">
          <div className="hm-weekdays">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="hm-grid">
            {cols.map((col, i) => (
              <div className="hm-col" key={i}>
                {col.days.map((day, j) => (
                  <i
                    key={j}
                    className={'hm-cell' + (day.level < 0 ? ' fut' : '')}
                    data-lv={day.level < 0 ? undefined : day.level}
                    title={day.level < 0 ? undefined : `${day.key}・${day.sp}SP`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="hm-foot">
        <span className="muted" style={{ fontSize: 11 }}>直近{WEEKS}週で {activeDays} 日活動</span>
        <div className="hm-legend">
          少
          <i data-lv={0} /><i data-lv={1} /><i data-lv={2} /><i data-lv={3} /><i data-lv={4} />
          多
        </div>
      </div>
    </div>
  )
}
