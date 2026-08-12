// ===== 効果音（Web Audioで合成・音源ファイル不要・軽量） =====
// 端末側で音を生成するため、ダウンロード0KB・著作権フリー・ユーザー数に非依存。
// ON/OFF は localStorage に保存。既定はON。

const KEY = 'kindai-growth-sound'
let ctx: AudioContext | null = null
let master: GainNode | null = null

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* noop */
  }
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.72
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

interface ToneOpts {
  f: number
  f2?: number
  type?: OscillatorType
  t?: number
  peak?: number
  atk?: number
  dur?: number
  lp?: number
}
function tone(o: ToneOpts): void {
  const c = ac()
  if (!c || !master) return
  const now = c.currentTime + (o.t || 0)
  const osc = c.createOscillator()
  osc.type = o.type || 'sine'
  osc.frequency.setValueAtTime(o.f, now)
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, now + (o.dur || 0.2))
  const g = c.createGain()
  const peak = o.peak ?? 0.18
  const atk = o.atk ?? 0.004
  const dur = o.dur ?? 0.2
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(peak, now + atk)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  let node: AudioNode = osc
  if (o.lp) {
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = o.lp
    osc.connect(f)
    node = f
  }
  node.connect(g).connect(master)
  osc.start(now)
  osc.stop(now + dur + 0.03)
}
function bell(f: number, t = 0, peak = 0.14, dur = 0.32): void {
  tone({ f, type: 'sine', t, peak, atk: 0.003, dur })
  tone({ f: f * 2.01, type: 'sine', t, peak: peak * 0.35, atk: 0.003, dur: dur * 0.7 })
}

export type SoundName = 'tap' | 'complete' | 'levelup' | 'coin' | 'reward' | 'back'
const SYNTH: Record<SoundName, () => void> = {
  tap() {
    tone({ f: 1250, f2: 640, type: 'triangle', peak: 0.1, atk: 0.002, dur: 0.05 })
    tone({ f: 2400, type: 'sine', peak: 0.03, dur: 0.03 })
  },
  complete() {
    ;[1318.5, 1661.2, 1975.5, 2637].forEach((f, i) => bell(f, i * 0.055, 0.14 - i * 0.015, 0.5))
    tone({ f: 660, type: 'sine', peak: 0.05, dur: 0.5 })
  },
  levelup() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.09, peak: 0.15, atk: 0.004, dur: 0.28 }))
    bell(2093, 0.42, 0.11, 0.6)
  },
  coin() {
    tone({ f: 987.8, type: 'square', peak: 0.1, dur: 0.07, lp: 3500 })
    tone({ f: 1318.5, type: 'square', t: 0.075, peak: 0.11, dur: 0.18, lp: 3500 })
  },
  reward() {
    ;[523.25, 659.25, 783.99].forEach((f) => tone({ f, type: 'triangle', peak: 0.09, atk: 0.02, dur: 0.55, lp: 2600 }))
    bell(1046.5, 0.02, 0.12, 0.7)
    bell(1568, 0.14, 0.08, 0.6)
  },
  back() {
    tone({ f: 640, f2: 400, type: 'sine', peak: 0.09, atk: 0.005, dur: 0.2 })
  },
}

export function playSound(name: SoundName): void {
  if (!isSoundEnabled()) return
  try {
    SYNTH[name]()
  } catch {
    /* 音の失敗は無視 */
  }
}

// 全ボタンの押下音を一括で有効化。data-sound 属性で個別上書き可（"none"=無音 / 名前=その音）。
let installed = false
export function installTapSound(): void {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.addEventListener(
    'pointerdown',
    (e) => {
      const t = e.target as HTMLElement | null
      const el = t && typeof t.closest === 'function' ? (t.closest('button,[role="button"]') as HTMLElement | null) : null
      if (!el || (el as HTMLButtonElement).disabled) return
      const s = el.dataset ? el.dataset.sound : undefined
      if (s === 'none') return
      if (s && s in SYNTH) playSound(s as SoundName)
      else playSound('tap')
    },
    { passive: true },
  )
}
