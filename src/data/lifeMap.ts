// ===== LIFE QUEST MAP（大学生活すごろく）=====
// 「願望 → 小さな現実行動 → 継続 → 次の行動 → 現実のゴール」を、
// 大学生活テーマ別のロードマップ（すごろく）として表現する。
//
// 設計方針:
// - マス(LifeNode)は基本「現実で実行できる小さな行動」。単なる+コインにしない。
// - ルート(LifeRoute)はゴールまでを小さく分解した“線形ロードマップ”＋途中に分岐1つ。
// - 分岐(branch)の選択は variant として保存し、以降のマス文言/ゴール文言（{v}）を変える。
//   → 少ないデータで「選択でその後が変わる」体験を、堅牢な線形走査のまま実現。
// - カテゴリは既存の Category に接続し、達成時に SP/EXP/ステータスへ反映（＝現実行動の結果）。
// - 後からルート/マス/イベントを足しやすいよう、純データで表現（AI調整も将来ここに差し込める）。

import type { Category } from './types'

// 1日のルーレット回数（日替わりリセット）。約45マスを2週間前後で踏破するペース。
// ボーナスマス（もう1回）は消費しないため、実際はこれより少し多く回せる。数値は調整可。
export const LIFE_DAILY_ROLLS = 3

export type LifeRouteId =
  | 'body'
  | 'social'
  | 'love'
  | 'play'
  | 'travel'
  | 'money'
  | 'self'
  | 'study'
  | 'career'
  | 'challenge'

// quest=課題(現実行動が必要) / branch=分岐 / goal=ゴール / fortune=今日の過ごし方(占い) /
// event=特別イベント / bonus=ボーナス / rest=ひとやすみ / milestone=中間ゴール
export type LifeNodeKind = 'quest' | 'branch' | 'goal' | 'fortune' | 'event' | 'bonus' | 'rest' | 'milestone'

/** 自動解決マス（ルーレットで止まると自動で報酬→演出）。quest/branch/goal だけは行動/選択が必要。 */
export const AUTO_KINDS: LifeNodeKind[] = ['fortune', 'event', 'bonus', 'rest', 'milestone']
export function isAutoNode(kind: LifeNodeKind): boolean {
  return AUTO_KINDS.includes(kind)
}

export interface LifeChoice {
  label: string
  emoji: string
}

export interface LifeNode {
  id: string
  kind: LifeNodeKind
  title: string // {v} は選択した分岐ラベルに置換される
  hint?: string
  emoji: string
  category: Category // 達成時にこのカテゴリのステータスへ加点＋SP/EXP付与
  sp: number
  exp: number
  stat: number
  choices?: LifeChoice[] // kind='branch' のときの選択肢
  bonusSpin?: boolean // 「もう1回！」＝このマスは今日のターンを消費しない
  points?: number // 追加コイン（イベント/ボーナス用）
}

export interface LifeRoute {
  id: LifeRouteId
  theme: string
  emoji: string
  color: string // ルートのアクセント色
  tagline: string
  nodes: LifeNode[] // 先頭=START、末尾=goal
}

// ---- ノード生成ヘルパー（データ量を抑えつつ意図を明確に） ----
const q = (id: string, emoji: string, title: string, category: Category, sp: number, exp: number, stat: number, hint?: string): LifeNode => ({
  id,
  kind: 'quest',
  emoji,
  title,
  category,
  sp,
  exp,
  stat,
  hint,
})
const branch = (id: string, emoji: string, title: string, choices: LifeChoice[]): LifeNode => ({
  id,
  kind: 'branch',
  emoji,
  title,
  category: '振り返り',
  sp: 0,
  exp: 10,
  stat: 0,
  choices,
})
const goal = (id: string, emoji: string, title: string, category: Category): LifeNode => ({
  id,
  kind: 'goal',
  emoji,
  title,
  category,
  sp: 40,
  exp: 60,
  stat: 3,
})

export const LIFE_ROUTES: LifeRoute[] = [
  {
    id: 'body',
    theme: '筋トレ・身体',
    emoji: '💪',
    color: '#ef4444',
    tagline: '理想の身体をゲームで攻略',
    nodes: [
      q('body_1', '💪', 'まず15分だけ筋トレしてみよう', '運動', 22, 30, 2, '腕立て・スクワットだけでOK'),
      branch('body_b', '🎯', 'どんな身体を目指す？', [
        { label: '筋肉をつけたい', emoji: '💪' },
        { label: '引き締めたい', emoji: '🔥' },
        { label: '健康的になりたい', emoji: '🌿' },
      ]),
      q('body_2', '📸', '今の自分の写真を撮って記録しよう', '振り返り', 18, 24, 1, 'ビフォー写真は続けるほど効く'),
      q('body_3', '🥗', 'コンビニで高タンパクな食事を選ぼう', '生活習慣', 18, 24, 1),
      q('body_4', '🏋️', '3日つづけて運動してみよう', '運動', 24, 34, 2),
      q('body_5', '📅', '1週間の運動ルーティンを決めよう', '生活習慣', 22, 30, 2),
      q('body_6', '🔁', '2週間つづけてみよう', '運動', 28, 40, 2),
      goal('body_g', '🏆', '「{v}」身体を手に入れよう', '運動'),
    ],
  },
  {
    id: 'social',
    theme: '友達・交流',
    emoji: '🤝',
    color: '#f59e0b',
    tagline: 'つながりを広げる冒険',
    nodes: [
      q('social_1', '👋', '今日、友達を1人ごはんに誘ってみよう', '振り返り', 22, 30, 2),
      branch('social_b', '🎯', '交流をどう増やす？', [
        { label: '今の友達と深める', emoji: '🤝' },
        { label: '新しい友達を作る', emoji: '✨' },
      ]),
      q('social_2', '💬', 'しばらく連絡してない人にメッセージしよう', '振り返り', 18, 24, 1),
      q('social_3', '🎈', 'サークル・イベントに1つ参加してみよう', '生活習慣', 22, 30, 2),
      q('social_4', '🍽️', '3人以上で集まる予定を立てよう', '振り返り', 24, 34, 2),
      q('social_5', '📇', '新しく知り合った人と連絡先を交換しよう', '振り返り', 22, 30, 2),
      goal('social_g', '🏆', '「{v}」つながりを広げよう', '振り返り'),
    ],
  },
  {
    id: 'love',
    theme: '恋愛・出会い',
    emoji: '❤️',
    color: '#ec4899',
    tagline: 'ときめきに一歩ふみ出す',
    nodes: [
      q('love_1', '✨', '身だしなみを整えて出かけよう', '振り返り', 20, 28, 2),
      branch('love_b', '🎯', '恋愛の目標は？', [
        { label: '出会いを増やす', emoji: '💘' },
        { label: '気になる人と進展', emoji: '🔥' },
      ]),
      q('love_2', '🗣️', '気になる人・出会いの場で1回話しかけよう', '振り返り', 24, 34, 2),
      q('love_3', '☕', '誰かをお茶・ごはんに誘ってみよう', '振り返り', 24, 34, 2),
      q('love_4', '🎁', '相手が喜ぶことを1つしてみよう', '振り返り', 22, 30, 2),
      goal('love_g', '🏆', '「{v}」充実した関係を築こう', '振り返り'),
    ],
  },
  {
    id: 'play',
    theme: '遊び・思い出',
    emoji: '🎉',
    color: '#8b5cf6',
    tagline: '“今しかない”を思い出に',
    nodes: [
      q('play_1', '🎉', '今週末の遊びの予定を1つ入れよう', '生活習慣', 20, 28, 1),
      branch('play_b', '🎯', 'どんな思い出をつくる？', [
        { label: 'みんなでワイワイ', emoji: '🎊' },
        { label: '非日常を体験', emoji: '🎢' },
      ]),
      q('play_2', '📍', '行ったことない場所を3つ書き出そう', '振り返り', 18, 24, 1),
      q('play_3', '📸', '遊びの思い出を写真に残そう', '振り返り', 18, 24, 1),
      q('play_4', '🕹️', '新しい遊び・アクティビティを1つ試そう', '生活習慣', 24, 34, 2),
      goal('play_g', '🏆', '「{v}」最高の思い出をつくろう', '生活習慣'),
    ],
  },
  {
    id: 'travel',
    theme: '旅行・新しい経験',
    emoji: '✈️',
    color: '#06b6d4',
    tagline: '行きたい場所へ、現実に',
    nodes: [
      q('travel_1', '🗺️', '行きたい場所を3つ保存しよう', '振り返り', 20, 28, 1),
      branch('travel_b', '🎯', 'どこへ行く？', [
        { label: '国内旅行', emoji: '🚄' },
        { label: '海外旅行', emoji: '🛫' },
      ]),
      q('travel_2', '💴', '「{v}」のだいたいの費用を調べよう', '生活習慣', 20, 28, 1),
      q('travel_3', '👥', '一緒に行く友達を誘ってみよう', '振り返り', 22, 30, 2),
      q('travel_4', '🐖', '目標貯金額を決めて貯め始めよう', '生活習慣', 22, 30, 2),
      q('travel_5', '📆', '日程の候補を決めよう', '生活習慣', 20, 28, 1),
      q('travel_6', '🎫', '交通・宿を1つ予約しよう', '生活習慣', 26, 36, 2),
      goal('travel_g', '🏆', '「{v}」に行って思い出を残そう', '生活習慣'),
    ],
  },
  {
    id: 'money',
    theme: 'バイト・お金',
    emoji: '💰',
    color: '#10b981',
    tagline: 'お金の余裕をつくる',
    nodes: [
      q('money_1', '💰', '今月使えるお金を確認しよう', '生活習慣', 20, 28, 1),
      branch('money_b', '🎯', 'お金の目標は？', [
        { label: '貯金したい', emoji: '🐖' },
        { label: '稼ぎたい', emoji: '💪' },
        { label: '賢く使いたい', emoji: '🧠' },
      ]),
      q('money_2', '🧾', '1週間、支出を記録してみよう', '生活習慣', 20, 28, 1),
      q('money_3', '🎯', '毎月の貯金/収入の目標を決めよう', '生活習慣', 22, 30, 2),
      q('money_4', '💼', '収入を1つ増やす工夫をしてみよう', '生活習慣', 24, 34, 2),
      q('money_5', '🚫', '今週、ムダづかいを1つ減らそう', '生活習慣', 22, 30, 2),
      goal('money_g', '🏆', '「{v}」お金の余裕をつくろう', '生活習慣'),
    ],
  },
  {
    id: 'self',
    theme: '自分磨き',
    emoji: '🌟',
    color: '#a855f7',
    tagline: 'なりたい自分に近づく',
    nodes: [
      q('self_1', '🌟', '毎日つづけたい習慣を1つ決めよう', '生活習慣', 20, 28, 1),
      branch('self_b', '🎯', '何を磨く？', [
        { label: '見た目・清潔感', emoji: '💇' },
        { label: '内面・教養', emoji: '📖' },
        { label: 'スキル・特技', emoji: '🛠️' },
      ]),
      q('self_2', '🌅', '朝のルーティンを1つ整えよう', '生活習慣', 20, 28, 1),
      q('self_3', '📚', '「{v}」に関する情報を1つ調べよう', '勉強', 20, 28, 1),
      q('self_4', '🔁', '3日つづけてみよう', '振り返り', 22, 30, 2),
      q('self_5', '🪞', '1週間の変化を振り返ろう', '振り返り', 22, 30, 2),
      goal('self_g', '🏆', '「{v}」で自信をつけよう', '振り返り'),
    ],
  },
  {
    id: 'study',
    theme: '勉強・資格',
    emoji: '🧠',
    color: '#3b82f6',
    tagline: '“わかる”を積み上げる',
    nodes: [
      q('study_1', '📖', 'まず30分だけ集中してみよう', '勉強', 22, 30, 2),
      branch('study_b', '🎯', '勉強のゴールは？', [
        { label: '成績アップ', emoji: '📈' },
        { label: '資格取得', emoji: '📜' },
        { label: '語学力', emoji: '🔤' },
      ]),
      q('study_2', '🎯', '「{v}」の目標を1つ決めよう', '勉強', 20, 28, 1),
      q('study_3', '📅', '1週間の勉強計画を立てよう', '勉強', 20, 28, 1),
      q('study_4', '🔥', '3日連続で勉強しよう', '勉強', 24, 34, 2),
      q('study_5', '📝', '理解度を確認する小テストをしよう', '勉強', 22, 30, 2),
      goal('study_g', '🏆', '「{v}」を達成しよう', '勉強'),
    ],
  },
  {
    id: 'career',
    theme: 'キャリア・就活',
    emoji: '💼',
    color: '#0ea5e9',
    tagline: '将来へ一歩ずつ',
    nodes: [
      q('career_1', '💼', '興味ある業界を3つ書き出そう', '生活習慣', 20, 28, 1),
      branch('career_b', '🎯', '就活の方向性は？', [
        { label: 'インターン参加', emoji: '🧑‍💻' },
        { label: '自己分析を深める', emoji: '🔍' },
        { label: '業界研究', emoji: '📊' },
      ]),
      q('career_2', '📝', '自己PRを1つ言語化してみよう', '振り返り', 22, 30, 2),
      q('career_3', '🔎', '気になる企業・職種を3つ調べよう', '生活習慣', 20, 28, 1),
      q('career_4', '🤝', '説明会・イベントに1つ申し込もう', '生活習慣', 24, 34, 2),
      q('career_5', '📄', 'ガクチカ（学生時代の経験）を1つ書こう', '振り返り', 22, 30, 2),
      goal('career_g', '🏆', '「{v}」で一歩前進しよう', '生活習慣'),
    ],
  },
  {
    id: 'challenge',
    theme: '新しい挑戦',
    emoji: '🔥',
    color: '#f97316',
    tagline: 'はじめの一歩をゲームに',
    nodes: [
      q('challenge_1', '🔥', 'やってみたい新しいことを1つ書こう', '振り返り', 20, 28, 1),
      branch('challenge_b', '🎯', 'どんな挑戦？', [
        { label: '初めての体験', emoji: '🎢' },
        { label: '苦手の克服', emoji: '💪' },
        { label: '目標に挑戦', emoji: '🎯' },
      ]),
      q('challenge_2', '👣', 'そのための小さな一歩を今日ふみ出そう', '振り返り', 22, 30, 2),
      q('challenge_3', '📢', '挑戦することを誰かに宣言しよう', '振り返り', 22, 30, 2),
      q('challenge_4', '🔁', '1週間つづけてみよう', '生活習慣', 24, 34, 2),
      goal('challenge_g', '🏆', '「{v}」をやりきろう', '振り返り'),
    ],
  },
]

export function getLifeRoute(id: LifeRouteId | string | null | undefined): LifeRoute | undefined {
  return LIFE_ROUTES.find((r) => r.id === id)
}

// ===== すごろく盤面（サイコロで進む用に、行動マスの間へイベント/ボーナス/ひとやすみを織り込む） =====
// 人生ゲームらしい多彩なマスにしつつ、行動マス(quest)は必ず残す。
// フィラーは決定的に挿入する（id固定）ので、進行位置はセッションを跨いでも安定する。

// ---- 占いマス（今日の過ごし方・運勢）。人生ゲームの「マスごとの小イベント」に相当。自動解決＋小報酬。 ----
const f = (emoji: string, title: string, sp = 10, exp = 10, opts?: { bonusSpin?: boolean; points?: number }): Omit<LifeNode, 'id'> => ({
  kind: 'fortune',
  emoji,
  title,
  category: '振り返り',
  sp,
  exp,
  stat: 0,
  ...opts,
})
const FORTUNES: Omit<LifeNode, 'id'>[] = [
  f('🌤️', '今日は早起きが吉。朝の10分が一日を変える', 10, 12),
  f('🍀', '人に親切にすると幸運が巡ってくる日', 12, 10),
  f('📵', 'スマホを1時間置いて、目の前のことに集中してみて', 10, 12),
  f('☕', '気分転換に、新しいカフェや道を開拓すると◎', 10, 10),
  f('💧', '水をたくさん飲むと調子が上がる日', 8, 10),
  f('🎧', '好きな音楽で気分を上げてから動き出そう', 8, 10),
  f('🌙', '今夜は早めに寝ると、明日の自分が喜ぶ', 10, 12),
  f('📓', '思っていることを3行だけ書き出すと頭が軽くなる', 10, 12),
  f('🙆', '完璧を目指さない日。60点でOKと唱えよう', 8, 10),
  f('🚶', '5分だけ外を歩くと、気持ちが晴れる', 10, 10),
  f('🤝', '今日は誰かに「ありがとう」を伝えると運気UP', 12, 10),
  f('🍽️', 'ちゃんと3食たべると、集中力が戻ってくる', 8, 10),
  f('✨', '小さな成功をひとつ、自分でほめてあげよう', 10, 12),
  f('🌱', '“やらないこと”を1つ決めると前に進む', 10, 12),
  f('🎯', '今日やることを1つだけに絞ると捗る日', 12, 12),
  f('😊', '笑顔で挨拶すると、いい出会いがある予感', 12, 10, { bonusSpin: true }),
  f('🧹', '身のまわりを5分だけ片づけると流れが変わる', 8, 10),
  f('📚', '興味のあることを10分だけ調べてみよう', 10, 12),
  f('🛏️', '無理せず休むのも大事。今日は充電の日', 8, 12),
  f('🔥', 'やる気は動き出すと後からついてくる。まず一歩', 12, 12, { bonusSpin: true }),
]

// ---- 特別イベント（人生ゲームの波乱・一発逆転）。自動解決。大きめ or もう1回。 ----
const EVENTS: Omit<LifeNode, 'id'>[] = [
  { kind: 'event', emoji: '🎊', title: 'サークルの集まりに誘われた！ いい刺激をもらった', category: '振り返り', sp: 30, exp: 20, stat: 0 },
  { kind: 'event', emoji: '💸', title: '臨時収入！ 思わぬ形でコインGET', category: '生活習慣', sp: 20, exp: 12, stat: 0, points: 20 },
  { kind: 'event', emoji: '💌', title: '気になる人からメッセージ。ちょっと嬉しい一日', category: '振り返り', sp: 24, exp: 16, stat: 0 },
  { kind: 'event', emoji: '🌟', title: 'ラッキーチャンス到来！ もう1回まわせる', category: '振り返り', sp: 18, exp: 12, stat: 0, bonusSpin: true },
  { kind: 'event', emoji: '🏅', title: '努力が認められた！ 大きな自信になった', category: '振り返り', sp: 36, exp: 26, stat: 0 },
  { kind: 'event', emoji: '😵', title: '寝坊してしまった…でも切り替えれば大丈夫', category: '生活習慣', sp: 8, exp: 12, stat: 0 },
  { kind: 'event', emoji: '🎁', title: 'サプライズプレゼント！ ごほうびGET', category: '振り返り', sp: 26, exp: 16, stat: 0, points: 15 },
  { kind: 'event', emoji: '🍀', title: '偶然の再会。人とのつながりに感謝する日', category: '振り返り', sp: 22, exp: 14, stat: 0 },
  { kind: 'event', emoji: '⚡', title: 'ひらめきの瞬間！ 新しいアイデアがわいた', category: '勉強', sp: 24, exp: 18, stat: 0 },
  { kind: 'event', emoji: '🎉', title: '絶好調！ もう1回チャレンジできる', category: '振り返り', sp: 20, exp: 14, stat: 0, bonusSpin: true },
]

const RESTS: Omit<LifeNode, 'id'>[] = [
  { kind: 'rest', emoji: '☕', title: 'ひとやすみ。深呼吸して整えよう', category: '振り返り', sp: 8, exp: 10, stat: 0 },
  { kind: 'bonus', emoji: '🪙', title: 'ボーナスマス！ コインとスコアGET', category: '振り返り', sp: 18, exp: 12, stat: 0, points: 12 },
]

// ---- 中間ゴール（人生ゲームのマイルストーン payoff）。自動解決＋大報酬＋演出。 ----
const MILESTONES: Omit<LifeNode, 'id'>[] = [
  { kind: 'milestone', emoji: '🚩', title: '中間地点に到達！ ここまでの自分に拍手', category: '振り返り', sp: 40, exp: 40, stat: 1, points: 20 },
  { kind: 'milestone', emoji: '🏕️', title: 'チェックポイント通過！ ぐっと前進した', category: '振り返り', sp: 40, exp: 40, stat: 1, points: 20 },
]

// 盤面を約40〜50マスへ拡張：課題/分岐の間に、占い・イベント・休憩をたっぷり織り込み、
// 中間ゴール(マイルストーン)を1/3・2/3地点に配置する。人生ゲームらしい“長い道のり”をつくる。
const BLOCK = 6 // 各バックボーン間に挟むフィラー数
function expandRoute(route: LifeRoute): LifeNode[] {
  const out: LifeNode[] = []
  const backbone = route.nodes
  const gaps = Math.max(1, backbone.length - 1)
  let fi = 0
  let ei = 0
  let ri = 0
  let placedMs = 0
  const targetMs = 2
  backbone.forEach((n, i) => {
    out.push(n)
    const nextIsGoal = backbone[i + 1]?.kind === 'goal'
    const isLast = i === backbone.length - 1
    if (isLast || nextIsGoal) return
    for (let k = 0; k < BLOCK; k++) {
      const slot = i * BLOCK + k
      let t: Omit<LifeNode, 'id'>
      if (slot % 6 === 2) {
        t = EVENTS[ei % EVENTS.length]
        ei++
      } else if (slot % 6 === 5) {
        t = RESTS[ri % RESTS.length]
        ri++
      } else {
        t = FORTUNES[fi % FORTUNES.length]
        fi++
      }
      out.push({ ...t, id: `${route.id}_x${out.length}` })
    }
    // 1/3・2/3地点に中間ゴール
    const frac = (i + 1) / gaps
    if (placedMs < targetMs && frac >= (placedMs + 1) / (targetMs + 1)) {
      out.push({ ...MILESTONES[placedMs % MILESTONES.length], id: `${route.id}_ms${placedMs + 1}` })
      placedMs++
    }
  })
  return out
}

const BOARDS: Record<string, LifeNode[]> = Object.fromEntries(LIFE_ROUTES.map((r) => [r.id, expandRoute(r)]))

/** ルートの“すごろく盤面”（占い・イベント込みの実マス列・約40〜50マス）を返す */
export function getBoard(id: LifeRouteId | string | null | undefined): LifeNode[] {
  return (id && BOARDS[id]) || []
}

/** {v} を選択した分岐ラベルに置換 */
export function applyVariant(title: string, variant: string | null | undefined): string {
  return title.replace(/\{v\}/g, variant ?? '')
}
