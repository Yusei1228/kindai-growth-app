import { useApp } from '../store'
import { PageHead } from '../components/ui'
import { CATEGORY_TO_STAT, type Category } from '../data/types'

const CAT_EMOJI: Record<Category, string> = { 勉強: '📘', 運動: '❤️', 生活習慣: '⚡', 振り返り: '✨' }

export function ReflectionScreen() {
  const { state } = useApp()
  const logs = state.logs

  // 過去7日の日別SP
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    const sp = logs.filter((l) => l.date === key).reduce((s, l) => s + l.spEarned, 0)
    return { label: ['日', '月', '火', '水', '木', '金', '土'][d.getDay()], sp }
  })
  const maxSp = Math.max(60, ...days.map((d) => d.sp))

  const weekSp = days.reduce((s, d) => s + d.sp, 0)
  const weekMin = logs.filter((l) => Date.now() - l.at < 7 * 86400000).reduce((s, l) => s + l.minutes, 0)
  const weekCount = logs.filter((l) => Date.now() - l.at < 7 * 86400000).length

  return (
    <>
      <PageHead title="振り返り" />

      <div className="kpi-grid">
        <div className="kpi"><div className="lab">今週のSP</div><div className="num" style={{ color: 'var(--blue-600)' }}>{weekSp}</div></div>
        <div className="kpi"><div className="lab">記録回数</div><div className="num">{weekCount}<span style={{ fontSize: 14 }}> 回</span></div></div>
        <div className="kpi"><div className="lab">合計時間</div><div className="num">{weekMin}<span style={{ fontSize: 14 }}> 分</span></div></div>
        <div className="kpi"><div className="lab">連続日数</div><div className="num" style={{ color: '#f97316' }}>🔥{state.user.streak}</div></div>
      </div>

      <div className="section-card">
        <div className="bold">週間アクティビティ</div>
        <div className="bars">
          {days.map((d, i) => (
            <div className="b" key={i}>
              <i style={{ height: `${Math.max(4, (d.sp / maxSp) * 100)}%` }} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
        <div className="muted center" style={{ fontSize: 11 }}>日別の獲得SP（努力量）</div>
      </div>

      <div className="section-title">最近の記録</div>
      <div className="section-card" style={{ paddingTop: 4 }}>
        {logs.length === 0 && <p className="muted center" style={{ padding: 16 }}>まだ記録がありません</p>}
        {logs.slice(0, 12).map((l) => (
          <div className="log-item" key={l.id}>
            <div className="log-cat ico-chiryoku" style={catStyle(l.category)}>{CAT_EMOJI[l.category]}</div>
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
  const map: Record<Category, [string, string]> = {
    勉強: ['#e2ecfb', '#2563eb'],
    運動: ['#fde7ef', '#ec4899'],
    生活習慣: ['#fff0db', '#f59e0b'],
    振り返り: ['#fbe8fb', '#d946ef'],
  }
  const [bg, color] = map[cat]
  return { background: bg, color }
}
