// ===== デイリーミッション・プール（毎日入れ替わる）=====
// app_date から決定的に3件を抽選する。全ユーザー同じ日付なら同じ3件が出る。
// 報酬は「50人検証用の簡易仕様」に統一（daily: スコア+50 / EXP+30 / ステータス+3）。

import type { Category, Mission } from './types'
import { CATEGORY_TO_STAT } from './types'
import { appDate, dateSeed } from '../lib/appDate'

export const DAILY_REWARD = { sp: 50, exp: 30, coins: 5, statAmount: 3 } as const

interface PoolItem {
  id: string
  title: string
  category: Category
  targetMinutes: number
}

// 4カテゴリをバランスよく用意（勉強=知力 / 運動=体力 / 生活習慣=活力 / 振り返り=魅力）
const POOL: PoolItem[] = [
  { id: 'p01', title: '勉強を10分する', category: '勉強', targetMinutes: 10 },
  { id: 'p02', title: '英単語を15個おぼえる', category: '勉強', targetMinutes: 10 },
  { id: 'p03', title: '授業の復習を15分', category: '勉強', targetMinutes: 15 },
  { id: 'p04', title: '読書を10分する', category: '勉強', targetMinutes: 10 },
  { id: 'p05', title: 'ストレッチを5分する', category: '運動', targetMinutes: 5 },
  { id: 'p06', title: '腕立て・腹筋を10回', category: '運動', targetMinutes: 5 },
  { id: 'p07', title: '20分ウォーキング', category: '運動', targetMinutes: 20 },
  { id: 'p08', title: '階段を使って移動する', category: '運動', targetMinutes: 5 },
  { id: 'p09', title: '朝、決めた時間に起きる', category: '生活習慣', targetMinutes: 1 },
  { id: 'p10', title: '水を1.5L以上飲む', category: '生活習慣', targetMinutes: 1 },
  { id: 'p11', title: '机まわりを片付ける', category: '生活習慣', targetMinutes: 10 },
  { id: 'p12', title: '今日の予定を立てる', category: '生活習慣', targetMinutes: 5 },
  { id: 'p13', title: '今日の振り返りを書く', category: '振り返り', targetMinutes: 5 },
  { id: 'p14', title: '感謝したことを1つ書く', category: '振り返り', targetMinutes: 3 },
  { id: 'p15', title: '明日の目標を決める', category: '振り返り', targetMinutes: 3 },
]

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function toMission(item: PoolItem): Mission {
  const stat = CATEGORY_TO_STAT[item.category]
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    targetMinutes: item.targetMinutes,
    reward: { exp: DAILY_REWARD.exp, sp: DAILY_REWARD.sp, coins: DAILY_REWARD.coins, stat, statAmount: DAILY_REWARD.statAmount },
    done: false,
  }
}

/** その日の3件を決定的に抽選（カテゴリがなるべく被らないように選ぶ） */
export function pickDailyMissions(date: string = appDate()): Mission[] {
  const rng = mulberry32(dateSeed(date))
  const shuffled = [...POOL].sort(() => rng() - 0.5)

  const picked: PoolItem[] = []
  const usedCats = new Set<Category>()
  for (const item of shuffled) {
    if (picked.length >= 3) break
    if (usedCats.has(item.category)) continue
    picked.push(item)
    usedCats.add(item.category)
  }
  // カテゴリ不足で3件に満たない場合は残りから補充
  for (const item of shuffled) {
    if (picked.length >= 3) break
    if (picked.includes(item)) continue
    picked.push(item)
  }
  return picked.map(toMission)
}
