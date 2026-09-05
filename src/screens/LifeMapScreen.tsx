import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { MiniAvatar } from '../components/Avatar'
import { LIFE_ROUTES, LIFE_DAILY_ROLLS, getBoard, getLifeRoute, applyVariant, isAutoNode, type LifeRouteId, type LifeNode } from '../data/lifeMap'

// ===== LIFE QUEST MAP（大学生活すごろく・人生ゲーム版） =====
// 盤面は1画面に収まる“地図”（SVGの蛇行ボード）。マスの中身は止まってから判明（ミステリー）。
// ルーレットは常に画面下に固定（スクロール不要）。課題を現実で達成すると SP/EXP/ステータス。

const COLS = 5
const CELL = 100
const R = 40 // マス半径
const AR = 30 // コマ半径

// 未判明マスをカラフルに見せるパステル配色（位置で巡回）
const MYSTERY_FILL = ['#e7f0ff', '#e9fbef', '#fff6dd', '#ffeaea', '#f2ecff', '#e6fbfb', '#fff0e0', '#fdeafd']
const MYSTERY_RING = ['#7db1ff', '#5fca86', '#f2c14e', '#ff9d9d', '#b79cff', '#5cc9d6', '#ffab6b', '#e79ce6']

interface Popup {
  emoji: string
  title: string
  sub: string
  tone: 'event' | 'milestone' | 'fortune'
}

function tileColor(kind: LifeNode['kind'], rc: string): string {
  switch (kind) {
    case 'goal':
    case 'milestone':
    case 'bonus':
      return '#f2b03c'
    case 'fortune':
      return '#6fa8ff'
    case 'event':
      return '#a884ff'
    case 'rest':
      return '#5ec8ad'
    default:
      return rc // quest / branch
  }
}

export function LifeMapScreen({ notify, onLevelUp }: { notify: (m: string) => void; onLevelUp: (lv: number) => void }) {
  const { state, lifeRollsLeft, selectLifeRoute, rollLifeDice, resolveLifeSquare, resetLifeRoute } = useApp()
  const lm = state.lifeMap
  const route = getLifeRoute(lm.routeId)
  const board = getBoard(lm.routeId)
  const prog = route ? lm.progress[route.id] : undefined
  const pos = prog?.pos ?? -1
  const awaiting = !!prog?.awaiting
  const variant = prog?.variant ?? null
  const done = !!prog?.done

  const [pickerOpen, setPickerOpen] = useState(!route)
  const [histOpen, setHistOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const [popup, setPopup] = useState<Popup | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [wheelDeg, setWheelDeg] = useState(0)
  const [rollFace, setRollFace] = useState(0)
  const [walkPos, setWalkPos] = useState<number | null>(null)
  const timers = useRef<number[]>([])
  const boardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // 各マスの座標（蛇行：偶数行は左→右、奇数行は右→左）
  const pts = useMemo(() => {
    const n = board.length
    const arr: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / COLS)
      const inRow = i % COLS
      const col = row % 2 === 0 ? inRow : COLS - 1 - inRow
      arr.push({ x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 })
    }
    return arr
  }, [board.length])
  const rows = Math.max(1, Math.ceil(board.length / COLS))
  const vbW = COLS * CELL
  const vbH = rows * CELL

  const focusPos = walkPos ?? pos
  const piecePt = pts[Math.max(0, focusPos)] ?? { x: CELL / 2, y: CELL / 2 }

  // 現在地（コマ）が見えるよう盤面を自動スクロール
  useEffect(() => {
    const area = boardRef.current
    if (!area) return
    const svg = area.querySelector('svg')
    if (!svg) return
    const h = svg.clientHeight || area.scrollHeight
    const pt = pts[Math.max(0, focusPos)]
    if (!pt) return
    const target = (pt.y / vbH) * h - area.clientHeight / 2
    area.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPos, route?.id, pickerOpen])

  const pick = (id: LifeRouteId) => {
    selectLifeRoute(id)
    setPickerOpen(false)
  }

  const spin = () => {
    if (spinning || awaiting || done) return
    if (lifeRollsLeft <= 0) {
      notify('今日のターンは終了。また明日ここから続けよう🌙')
      return
    }
    setSpinning(true)
    const r = 1 + Math.floor(Math.random() * 6)
    const center = (r - 0.5) * 60
    const jitter = Math.floor(Math.random() * 30) - 15
    setWheelDeg((d) => d + 360 * 4 + (360 - (center % 360)) + jitter)
    setRollFace(r)

    const land = window.setTimeout(() => {
      const res = rollLifeDice(r)
      if (!res.ok) {
        setSpinning(false)
        if (res.noTurns) notify('今日のターンは終了。また明日ここから続けよう🌙')
        return
      }
      let step = res.from
      const walk = () => {
        step += 1
        setWalkPos(step)
        if (step < res.to) {
          const t = window.setTimeout(walk, 200)
          timers.current.push(t as unknown as number)
        } else {
          const arrive = window.setTimeout(() => {
            setWalkPos(null)
            setSpinning(false)
            handleLanding(res)
          }, 260)
          timers.current.push(arrive as unknown as number)
        }
      }
      const t0 = window.setTimeout(walk, 160)
      timers.current.push(t0 as unknown as number)
    }, 1250)
    timers.current.push(land as unknown as number)
  }

  const handleLanding = (res: ReturnType<typeof rollLifeDice>) => {
    if (res.leveledUp) onLevelUp(res.newLevel)
    if (!res.auto) return // 課題/分岐/ゴールは下部コントロールで対応
    const reward = [res.gainedSP ? `+${res.gainedSP}SP` : '', res.gainedExp ? `+${res.gainedExp}EXP` : ''].filter(Boolean).join(' ')
    const tone: Popup['tone'] = res.landedKind === 'milestone' ? 'milestone' : res.landedKind === 'event' ? 'event' : 'fortune'
    setPopup({ emoji: res.landedEmoji, title: res.title, sub: reward + (res.bonusSpin ? '　🎉 もう1回！' : ''), tone })
  }

  const resolve = (choiceLabel?: string) => {
    const r = resolveLifeSquare(choiceLabel)
    if (!r.ok) return
    if (r.isBranch) notify(`「${choiceLabel}」を選んだ！ここから道が変わる`)
    else {
      const parts = [r.gainedSP ? `+${r.gainedSP}SP` : '', r.gainedExp ? `+${r.gainedExp}EXP` : ''].filter(Boolean).join(' ')
      notify(r.isGoal ? '🏆 クエストクリア！' : `達成！ ${parts}`)
    }
    if (r.leveledUp) onLevelUp(r.newLevel)
    if (r.done) window.setTimeout(() => setCelebrate(true), 300)
  }

  if (pickerOpen || !route) {
    return <ThemePicker current={route?.id} onPick={pick} onClose={route ? () => setPickerOpen(false) : undefined} />
  }

  const total = board.length
  const completed = Math.max(0, Math.min(pos + 1, total))
  const pct = Math.round((completed / total) * 100)
  const landed = awaiting ? board[pos] : undefined
  const roadAll = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const roadDone = pts.slice(0, Math.max(1, Math.min(pos + 1, total))).map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="lm-screen">
      {/* ヘッダー（コンパクト） */}
      <div className="lm-header" style={{ ['--rc' as string]: route.color }}>
        <div className="lm-head-top">
          <div className="lm-theme-chip">
            <span className="lm-theme-emoji">{route.emoji}</span>
            <div>
              <div className="lm-theme-name">{route.theme}</div>
              <div className="lm-theme-tag">{completed}/{total}マス・目標：{route.tagline}</div>
            </div>
          </div>
          <div className="lm-head-btns">
            <button className="lm-icon-btn" onClick={() => setHistOpen(true)} aria-label="これまでの歩み" data-sound="tap">📖</button>
            <button className="lm-change" onClick={() => setPickerOpen(true)} data-sound="tap">テーマ変更</button>
          </div>
        </div>
        <div className="lm-progress">
          <div className="lm-progress-bar"><i style={{ width: pct + '%' }} /></div>
          <span className="lm-progress-txt">{pct}%</span>
        </div>
      </div>

      {/* 盤面（スクロールできる大きな地図） */}
      <div className="lm-board-area" ref={boardRef}>
        <svg className="lm-map" viewBox={`-16 -20 ${vbW + 32} ${vbH + 52}`} style={{ ['--rc' as string]: route.color, aspectRatio: `${vbW + 32} / ${vbH + 52}` }}>
          <defs>
            <linearGradient id="lmBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor={mix(route.color, 0.1)} />
            </linearGradient>
          </defs>
          {/* 盤面パネル */}
          <rect x={-16} y={-20} width={vbW + 32} height={vbH + 52} rx="26" fill="url(#lmBg)" stroke={mix(route.color, 0.28)} strokeWidth="2" />
          {/* 装飾 */}
          <text x={4} y={-2} fontSize="26" opacity="0.5">✨</text>
          <text x={vbW - 26} y={-2} fontSize="24" opacity="0.45">🌸</text>
          <text x={vbW - 30} y={vbH + 24} fontSize="24" opacity="0.4">🌟</text>
          {/* 道：白ケーシング＋ベース＋通過済み */}
          <polyline points={roadAll} fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <polyline points={roadAll} fill="none" stroke="#dbe3ee" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={roadDone} fill="none" stroke={route.color} strokeOpacity="0.7" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={roadAll} fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" opacity="0.8" />
          {/* マス */}
          {board.map((n, i) => {
            const p = pts[i]
            const revealed = i <= pos
            const structural = n.kind === 'goal' || n.kind === 'branch' || n.kind === 'milestone'
            const show = revealed || structural
            const mystery = !show
            const ring = mystery ? MYSTERY_RING[i % MYSTERY_RING.length] : tileColor(n.kind, route.color)
            const fill = mystery ? MYSTERY_FILL[i % MYSTERY_FILL.length] : '#ffffff'
            const icon = mystery ? '？' : n.emoji
            const isCurrent = i === focusPos
            const rr = isCurrent ? R + 3 : R
            return (
              <g key={n.id} className={'lm-tile' + (isCurrent ? ' cur' : '')}>
                {isCurrent && <circle cx={p.x} cy={p.y} r={rr + 7} fill={ring} opacity="0.18" />}
                <circle cx={p.x} cy={p.y + 3} r={rr} fill="rgba(15,23,42,0.10)" />
                <circle cx={p.x} cy={p.y} r={rr} fill={fill} stroke={ring} strokeWidth={isCurrent ? 6 : 4} />
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={mystery ? 34 : 40} fontWeight="900" fill={mystery ? ring : '#1e293b'}>{icon}</text>
                {revealed && !structural && (
                  <g>
                    <circle cx={p.x + rr * 0.72} cy={p.y - rr * 0.72} r="11" fill="#12a150" />
                    <text x={p.x + rr * 0.72} y={p.y - rr * 0.72} textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="900" fill="#fff">✓</text>
                  </g>
                )}
                {i === 0 && <FlagLabel x={p.x} y={p.y - R - 6} text="START" color="#12a150" />}
                {n.kind === 'goal' && <FlagLabel x={p.x} y={p.y + R + 26} text="GOAL" color="#d98a24" />}
              </g>
            )
          })}
          {/* コマ（アバター） */}
          <g transform={`translate(${piecePt.x} ${piecePt.y})`}>
            <g key={'hop' + focusPos} className="lm-piece">
              <ellipse cx="0" cy={-R + 2} rx={AR * 0.7} ry="4.5" fill="#0f172a" opacity="0.2" />
              <circle cx="0" cy={-R - 8 - AR} r={AR + 4} fill="#fff" stroke={route.color} strokeWidth="3.5" />
              <foreignObject x={-AR} y={-R - 8 - AR * 2} width={AR * 2} height={AR * 2}>
                <div className="lm-piece-av"><MiniAvatar /></div>
              </foreignObject>
            </g>
          </g>
        </svg>
      </div>

      {/* 下部コントロール（常に固定・スクロール不要） */}
      <div className="lm-control" style={{ ['--rc' as string]: route.color }}>
        {done ? (
          <div className="lm-done-card">
            <div className="lm-action-title">🏆 「{route.theme}」クリア！</div>
            <div className="lm-choices">
              <button className="lm-choice" onClick={() => setPickerOpen(true)} data-sound="tap">🗺️ 別のテーマ</button>
              <button className="lm-choice" onClick={() => resetLifeRoute(route.id)} data-sound="tap">🔁 もう一度</button>
            </div>
          </div>
        ) : awaiting && landed ? (
          <div className="lm-actionbar">
            <div className="lm-action-tag">{landed.kind === 'branch' ? '🔀 分岐マス' : landed.kind === 'goal' ? '🏁 ゴールマス' : '🎯 今日の課題'}</div>
            <div className="lm-action-title"><span className="lm-action-emoji">{landed.emoji}</span>{applyVariant(landed.title, variant)}</div>
            {landed.hint && <div className="lm-action-hint">{landed.hint}</div>}
            {landed.kind === 'branch' ? (
              <div className="lm-choices">
                {landed.choices?.map((c) => (
                  <button key={c.label} className="lm-choice" onClick={() => resolve(c.label)} data-sound="tap"><span>{c.emoji}</span> {c.label}</button>
                ))}
              </div>
            ) : (
              <button className="lm-do-btn" onClick={() => resolve()} data-sound="levelup">
                {landed.kind === 'goal' ? 'クエストを完了する 🏆' : '現実で行動した！達成 ✓'}
              </button>
            )}
          </div>
        ) : (
          <div className="lm-spinbar">
            <div className="lm-roulette sm">
              <div className="lm-pointer" />
              <div className="lm-wheel" style={{ transform: `rotate(${wheelDeg}deg)`, transition: spinning ? 'transform 1.2s cubic-bezier(.15,.85,.25,1)' : 'none' }}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <span key={num} className="lm-wheel-num" style={{ transform: `rotate(${(num - 0.5) * 60}deg) translateY(-30px) rotate(${-(num - 0.5) * 60}deg)` }}>{num}</span>
                ))}
              </div>
              <div className="lm-wheel-hub">{spinning ? '🎲' : rollFace || '？'}</div>
            </div>
            <div className="lm-spinbar-right">
              <div className="lm-turns">
                {Array.from({ length: LIFE_DAILY_ROLLS }).map((_, i) => (
                  <span key={i} className={'lm-turn-pip' + (i < lifeRollsLeft ? ' on' : '')} />
                ))}
                <span className="lm-turns-txt">残り{lifeRollsLeft}ターン</span>
              </div>
              <button className="lm-do-btn" onClick={spin} disabled={spinning || lifeRollsLeft <= 0} data-sound="tap">
                {spinning ? 'まわしています…' : lifeRollsLeft <= 0 ? '今日のターンは終了 🌙' : pos < 0 ? '回して出発！ 🎡' : 'ルーレットを回す 🎡'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* マス内容の“判明”ポップアップ（イベント/占い/中間ゴール） */}
      {popup && (
        <div className="overlay" onClick={() => setPopup(null)}>
          <div className={'lm-popup tone-' + popup.tone} onClick={(e) => e.stopPropagation()}>
            <div className="lm-popup-emoji">{popup.emoji}</div>
            <div className="lm-popup-kind">{popup.tone === 'milestone' ? '🚩 中間ゴール！' : popup.tone === 'event' ? '✨ スペシャルイベント' : '🔮 今日の占い'}</div>
            <div className="lm-popup-title">{popup.title}</div>
            {popup.sub && <div className="lm-popup-sub">{popup.sub}</div>}
            <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setPopup(null)}>やったね！</button>
          </div>
        </div>
      )}

      {/* これまでの歩み */}
      {histOpen && (
        <div className="overlay" onClick={() => setHistOpen(false)}>
          <div className="lm-hist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lm-hist-head">📖 これまでの歩み<button className="lm-hist-close" onClick={() => setHistOpen(false)}>×</button></div>
            {lm.history.length === 0 ? (
              <p className="hint center" style={{ padding: '20px 0' }}>まだ記録がありません。ルーレットを回して旅を始めよう！</p>
            ) : (
              <div className="lm-hist-list">
                {lm.history.map((h, i) => (
                  <div key={h.nodeId + i} className="lm-history-row">
                    <span className="lm-history-emoji">{h.emoji}</span>
                    <span className="lm-history-title">{h.title}</span>
                    <span className="lm-history-date">{h.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {celebrate && (
        <div className="overlay" onClick={() => setCelebrate(false)}>
          <div className="levelup" onClick={(e) => e.stopPropagation()}>
            <div className="big">🏆</div>
            <h2>QUEST COMPLETE!</h2>
            <p className="bold" style={{ fontSize: 18, margin: '4px 0' }}>{route.emoji} {route.theme}</p>
            <p className="muted" style={{ fontSize: 13 }}>現実の大学生活を、大きく前に進めた！</p>
            <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setCelebrate(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  )
}

// hex色を白と混ぜて薄くする（amt=色の割合 0..1）
function mix(hex: string, amt: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const bl = (c: number) => Math.round(c * amt + 255 * (1 - amt))
  return '#' + [bl(r), bl(g), bl(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

// 盤面のSTART/GOALの旗ラベル
function FlagLabel({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  const w = text.length * 11 + 20
  return (
    <g>
      <rect x={x - w / 2} y={y - 12} width={w} height={24} rx={12} fill={color} stroke="#fff" strokeWidth="1.5" />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="900" fill="#fff" letterSpacing="1">{text}</text>
    </g>
  )
}

function ThemePicker({ current, onPick, onClose }: { current?: LifeRouteId; onPick: (id: LifeRouteId) => void; onClose?: () => void }) {
  return (
    <div className="lm-picker">
      <div className="lm-picker-head">
        <div className="lm-picker-kicker">🗺️ LIFE QUEST MAP</div>
        <h1 className="lm-picker-title">今の大学生活で、<br />何をもっと充実させたい？</h1>
        <p className="lm-picker-sub">1つ選ぶと、その願いを叶える“人生すごろく”が始まります。</p>
        {onClose && <button className="lm-picker-close" onClick={onClose} aria-label="閉じる" data-sound="back">×</button>}
      </div>
      <div className="lm-theme-grid">
        {LIFE_ROUTES.map((r) => (
          <button
            key={r.id}
            className={'lm-theme-card' + (current === r.id ? ' selected' : '')}
            style={{ ['--rc' as string]: r.color }}
            onClick={() => onPick(r.id)}
            data-sound="tap"
          >
            <span className="lm-theme-card-emoji">{r.emoji}</span>
            <span className="lm-theme-card-name">{r.theme}</span>
            <span className="lm-theme-card-tag">{r.tagline}</span>
            {current === r.id && <span className="lm-theme-card-badge">選択中</span>}
          </button>
        ))}
      </div>
      <p className="hint center" style={{ marginBottom: 8 }}>勉強・就活だけが正解じゃない。恋愛も遊びも旅行も、あなたの大学生活。</p>
    </div>
  )
}
