// ===== 進行中タイマーの永続化 =====
// 経過時間は「壁時計（実時間）」ベースで管理する。setIntervalのカウントに依存しないため、
// バックグラウンド・タブ非表示・アプリ再起動をまたいでも正確に計測できる。
import type { ActiveMission } from '../data/types'

const KEY = 'kindai-growth-timer-v1'

export interface TimerSession {
  mission: ActiveMission
  target: number // 目標分（0=カウントアップ）
  originStart: number // 最初に開始した時刻（epoch ms・表示用）
  segmentStart: number | null // 現在の計測区間の開始時刻（epoch ms）。null=一時停止中
  accumulated: number // 一時停止までに積み上げた経過秒
  updatedAt: number
}

export function saveTimerSession(s: TimerSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 保存失敗は無視（プライベートモード等） */
  }
}

export function loadTimerSession(): TimerSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as TimerSession
    if (!s || !s.mission) return null
    return s
  } catch {
    return null
  }
}

export function clearTimerSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

/** セッションから現在の経過秒を実時間で算出 */
export function elapsedFrom(s: { accumulated: number; segmentStart: number | null }, now: number = Date.now()): number {
  const running = s.segmentStart != null
  return s.accumulated + (running ? Math.max(0, Math.floor((now - (s.segmentStart as number)) / 1000)) : 0)
}
