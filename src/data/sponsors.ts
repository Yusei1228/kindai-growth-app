// ===== 協賛店舗マスタ（近大周辺・内部利用） =====
// 一覧/詳細の表示に使う。特典(benefit)は Supabase の gacha_prizes 側の当選クーポンと一致させている。
// ※一般公開はせず、近大生の少人数で利用する前提。

export interface Sponsor {
  id: string
  name: string
  category: string
  benefit: string // 代表特典（一覧のバッジ＝ガチャ当選クーポン）
  emoji: string
  area: string // 近大からの位置
  address: string
  hours: string
  holiday: string
  conditions: string[]
}

const COND = ['1人1回まで', '学生証の提示が必要', '他クーポンとの併用不可']

export const SPONSORS: Sponsor[] = [
  { id: 's01', name: '近大をすすらんか', category: 'ラーメン', benefit: '味玉無料', emoji: '🍜', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '11:00〜23:00', holiday: '不定休', conditions: COND },
  { id: 's02', name: 'PEC CHICKEN CLUB', category: 'チキン', benefit: 'ドリンク1杯無料', emoji: '🍗', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '11:00〜22:00', holiday: '不定休', conditions: COND },
  { id: 's03', name: 'やみつきからあげ丼', category: 'からあげ丼', benefit: '唐揚げ1個増量', emoji: '🍚', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '11:00〜21:00', holiday: '不定休', conditions: COND },
  { id: 's04', name: '家系ラーメン教道家', category: '家系ラーメン', benefit: 'ライス無料', emoji: '🍜', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '11:00〜23:00', holiday: '不定休', conditions: COND },
  { id: 's05', name: '食べ放題居酒屋ばちや', category: '居酒屋', benefit: 'ソフトドリンク1杯無料', emoji: '🍶', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '17:00〜24:00', holiday: '不定休', conditions: COND },
  { id: 's06', name: 'きりん寺 近大前店', category: 'ラーメン', benefit: '替え玉無料', emoji: '🍜', area: '近畿大学 正門前付近', address: '大阪府東大阪市・近大前', hours: '11:00〜23:00', holiday: '不定休', conditions: COND },
  { id: 's07', name: '街かど屋 近大前店', category: '定食', benefit: '小鉢1品サービス', emoji: '🍱', area: '近畿大学 正門前付近', address: '大阪府東大阪市・近大前', hours: '10:00〜23:00', holiday: '年中無休', conditions: COND },
  { id: 's08', name: 'アサイーボウル / AnotheR', category: 'カフェ', benefit: 'トッピング1つ無料', emoji: '🍧', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '10:00〜19:00', holiday: '不定休', conditions: COND },
  { id: 's09', name: '焼マン 近大前店', category: '焼肉', benefit: 'ソフトドリンク無料', emoji: '🥩', area: '近畿大学 正門前付近', address: '大阪府東大阪市・近大前', hours: '17:00〜24:00', holiday: '不定休', conditions: COND },
  { id: 's10', name: 'つけ麺 雀', category: 'つけ麺', benefit: '大盛り無料', emoji: '🍜', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '11:00〜22:00', holiday: '不定休', conditions: COND },
  { id: 's11', name: '麵屋こころ 長瀬店', category: '台湾まぜそば', benefit: '追い飯無料', emoji: '🍜', area: '長瀬駅周辺', address: '大阪府東大阪市・長瀬駅周辺', hours: '11:00〜23:00', holiday: '不定休', conditions: COND },
  { id: 's12', name: '麵や 清流', category: 'ラーメン', benefit: '味玉無料', emoji: '🍜', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '11:00〜22:00', holiday: '不定休', conditions: COND },
  { id: 's13', name: '麵屋 蝉 本店', category: 'ラーメン', benefit: '替え玉無料', emoji: '🍜', area: '近畿大学周辺', address: '大阪府東大阪市・近大周辺', hours: '11:00〜22:00', holiday: '不定休', conditions: COND },
  { id: 's14', name: '焼き鳥 吉鳥 長瀬駅前店', category: '焼き鳥', benefit: '焼き鳥1本サービス', emoji: '🍢', area: '長瀬駅前', address: '大阪府東大阪市・長瀬駅前', hours: '17:00〜24:00', holiday: '不定休', conditions: COND },
]

export function sponsorById(id: string): Sponsor | undefined {
  return SPONSORS.find((s) => s.id === id)
}
