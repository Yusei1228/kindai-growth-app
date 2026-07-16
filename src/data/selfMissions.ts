// ===== セルフミッション（自分で選ぶ／作る）=====
// 簡易仕様: 達成でスコア+30 / EXP+20 / 該当ステータス+2。

import type { Category } from './types'

export const SELF_REWARD = { sp: 30, exp: 20, coins: 3, statAmount: 2 } as const

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
