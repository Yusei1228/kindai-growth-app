// ===== 初回チュートリアル =====
// デイリーミッションの固定1件目として表示。数タップの説明で完了し、
// Lv1→Lv2 になる経験値(+150)とスコア(+100)を付与する。
import type { Mission } from './types'

// expForLevel(1)=140 なので EXP 150 で確実に Lv1→Lv2
export const TUTORIAL_REWARD = { exp: 150, sp: 100, coins: 20, statAmount: 3 } as const

export const TUTORIAL_MISSION_ID = 'tutorial'

/** デイリー先頭に差し込むチュートリアル用ミッション */
export function tutorialMission(): Mission {
  return {
    id: TUTORIAL_MISSION_ID,
    title: 'アプリの使い方を覚えよう',
    category: '振り返り',
    targetMinutes: 0,
    timed: false,
    reward: { exp: TUTORIAL_REWARD.exp, sp: TUTORIAL_REWARD.sp, coins: TUTORIAL_REWARD.coins, stat: '魅力', statAmount: TUTORIAL_REWARD.statAmount },
    done: false,
  }
}

export interface TutorialStep {
  emoji: string
  title: string
  body: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    emoji: '🌱',
    title: 'ようこそ KINDAI GROWTH へ！',
    body: 'このアプリは、あなたの努力を記録して「レベル・ステータス・ランキング」で成長を見える化します。まずは使い方を1分でチェックしよう。',
  },
  {
    emoji: '📋',
    title: 'ミッションで成長しよう',
    body: '毎日入れ替わる「デイリーミッション」と、自分の目標に挑む「セルフミッション」があります。達成するとスコア・EXP・ステータスがアップ！',
  },
  {
    emoji: '📊',
    title: 'レベルとステータス',
    body: 'ミッションを続けるとレベルが上がり、体力・知力・活力・魅力の4つのステータスが伸びていきます。自分の成長が一目でわかります。',
  },
  {
    emoji: '🏆',
    title: 'みんなでランキング',
    body: '累計スコアで近大生の仲間と競争！ 下の「ランキング」から自分の順位や上位の人を確認できます。上位を目指して続けよう。',
  },
  {
    emoji: '🎁',
    title: 'さっそく始めよう！',
    body: 'このチュートリアルを完了すると、ボーナスとして経験値とスコアがもらえて、いきなりレベルアップします。準備はいいですか？',
  },
]
