// ===== セルフミッション（自分で選ぶ／作る）=====
// 実行時間に応じてスコアが変わる簡易仕様（長く取り組むほど加算・上限あり）。

import type { Category } from './types'

/** 即完了時のデフォルト目安時間（分） */
export const SELF_DEFAULT_MINUTES = 15
export const SELF_COINS = 3

/** 実行時間(分)→ スコア/EXP/ステータス上昇量（1〜120分でスケール、それ以上は頭打ち） */
export function selfReward(minutes: number): { sp: number; exp: number; statAmount: number } {
  const m = Math.max(1, Math.min(120, Math.round(minutes)))
  const sp = 10 + m // 5分→15 / 15分→25 / 30分→40 / 60分→70 / 120分→130
  const exp = Math.round(sp * 0.7) // EXPはスコアの約7割
  const statAmount = m >= 60 ? 3 : m >= 30 ? 2 : 1
  return { sp, exp, statAmount }
}

export interface SelfPreset {
  title: string
  category: Category
  emoji: string
}

export const SELF_PRESETS: SelfPreset[] = [
  { title: '勉強', category: '勉強', emoji: '📘' },
  { title: '読書', category: '勉強', emoji: '📖' },
  { title: '課題・レポート', category: '勉強', emoji: '📝' },
  { title: '筋トレ', category: '運動', emoji: '💪' },
  { title: 'ランニング', category: '運動', emoji: '🏃' },
  { title: 'ストレッチ', category: '運動', emoji: '🧘' },
  { title: '早寝・早起き', category: '生活習慣', emoji: '🌅' },
  { title: '片付け・掃除', category: '生活習慣', emoji: '🧹' },
  { title: '自炊する', category: '生活習慣', emoji: '🍳' },
  { title: '日記を書く', category: '振り返り', emoji: '✍️' },
  { title: '瞑想する', category: '振り返り', emoji: '🌿' },
]

export const CATEGORIES: Category[] = ['勉強', '運動', '生活習慣', '振り返り']
