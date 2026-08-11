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
  timed: boolean // true=時間指定タイマー / false=タイマー無し（感想入力へ）
}

// 4カテゴリをバランスよく用意（勉強=知力 / 運動=体力 / 生活習慣=活力 / 振り返り=魅力）
// timed:true は「その時間ちょうどのカウントダウン」、false はタイマー無しで感想入力へ
const POOL: PoolItem[] = [
  // 勉強（知力）
  { id: 'p01', title: '勉強・課題を10分する', category: '勉強', targetMinutes: 10, timed: true },
  { id: 'p02', title: '英単語を15個おぼえる', category: '勉強', targetMinutes: 0, timed: false },
  { id: 'p03', title: '授業ノートを見返す', category: '勉強', targetMinutes: 0, timed: false },
  { id: 'p04', title: '読書を10分する', category: '勉強', targetMinutes: 10, timed: true },
  { id: 'p05', title: '資格・テスト勉強を15分', category: '勉強', targetMinutes: 15, timed: true },
  // 運動（体力）
  { id: 'p06', title: 'ストレッチを5分する', category: '運動', targetMinutes: 5, timed: true },
  { id: 'p07', title: '腕立て・腹筋を各10回', category: '運動', targetMinutes: 0, timed: false },
  { id: 'p08', title: '20分歩く', category: '運動', targetMinutes: 20, timed: true },
  { id: 'p09', title: '階段を使って移動する', category: '運動', targetMinutes: 0, timed: false },
  { id: 'p10', title: '軽く筋トレする', category: '運動', targetMinutes: 10, timed: true },
  // 生活習慣（活力）※「決めた時間に起きる」等の日を持ち越す項目は当日完了できないため除外
  { id: 'p12', title: 'こまめに水分をとる', category: '生活習慣', targetMinutes: 0, timed: false },
  { id: 'p13', title: '机まわりを片付ける', category: '生活習慣', targetMinutes: 0, timed: false },
  { id: 'p14', title: '今日の予定を立てる', category: '生活習慣', targetMinutes: 0, timed: false },
  // 振り返り（魅力）
  { id: 'p15', title: '今日の出来事を振り返る', category: '振り返り', targetMinutes: 0, timed: false },
  { id: 'p16', title: '感謝したことを1つ書く', category: '振り返り', targetMinutes: 0, timed: false },
  { id: 'p17', title: '明日の目標を決める', category: '振り返り', targetMinutes: 0, timed: false },
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
    timed: item.timed,
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
