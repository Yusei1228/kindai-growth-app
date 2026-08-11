// ===== セルフミッション（8種）=====
// 「ミッション選択」画面に並ぶ8項目。時間比例でEXP/SPを付与（timed=false は固定・タイマー無し）。

import type { SelfMission } from './types'

export const SELF_COINS = 3

export const SELF_MISSIONS: SelfMission[] = [
  { id: 'kintore', title: '筋トレ', emoji: '💪', category: '運動', exp30: 40, sp30: 20, stats: ['体力', '活力'], timed: true },
  { id: 'running', title: 'ランニング', emoji: '🏃', category: '運動', exp30: 38, sp30: 19, stats: ['体力', '活力'], timed: true },
  { id: 'reading', title: '読書', emoji: '📖', category: '勉強', exp30: 30, sp30: 15, stats: ['知力', '活力'], timed: true },
  { id: 'study', title: '勉強', emoji: '📘', category: '勉強', exp30: 40, sp30: 20, stats: ['知力', '活力'], timed: true },
  { id: 'life', title: '生活習慣', emoji: '⚡', category: '生活習慣', exp30: 25, sp30: 15, stats: ['活力', '魅力'], timed: true },
  { id: 'diary', title: '日記を書く', emoji: '✍️', category: '振り返り', exp30: 20, sp30: 10, stats: ['活力', '知力'], timed: false },
  { id: 'stretch', title: 'ストレッチ・瞑想', emoji: '🧘', category: '運動', exp30: 25, sp30: 15, stats: ['体力', '活力'], timed: true },
  { id: 'social', title: '交流・挑戦', emoji: '🤝', category: '振り返り', exp30: 20, sp30: 10, stats: ['魅力'], timed: false },
]

/** 実行時間(分)に応じた報酬。timed=false は固定（30分基準）。上限120分。 */
export function selfMissionReward(m: SelfMission, minutes: number): { sp: number; exp: number; statAmount: number } {
  const t = m.timed ? Math.max(1, Math.min(120, Math.round(minutes) || 30)) : 30
  const factor = m.timed ? t / 30 : 1
  return {
    sp: Math.round(m.sp30 * factor),
    exp: Math.round(m.exp30 * factor),
    statAmount: t >= 60 ? 3 : t >= 30 ? 2 : 1, // 各ステータスへの上昇量
  }
}
