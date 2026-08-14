// ===== 協賛店舗マスタ（表示用・ダミー） =====
// 一覧/詳細の表示に使う。実提携が決まり次第、内容を差し替える。
// 実際にクーポンが当たる賞品プールは Supabase の gacha_prizes 側で管理。

export interface Sponsor {
  id: string
  name: string
  category: string
  benefit: string // 代表特典（一覧のバッジ）
  emoji: string
  area: string // 近大からの位置
  address: string
  hours: string
  holiday: string
  conditions: string[]
}

export const SPONSORS: Sponsor[] = [
  { id: 'ramen', name: 'ラーメン一心', category: 'ラーメン', benefit: '味玉無料', emoji: '🍜', area: '近畿大学 西門付近', address: '大阪府東大阪市○○1-2-3', hours: '11:00〜22:00', holiday: '不定休', conditions: ['1人1回まで', '学生証提示が必要', '他クーポンとの併用不可'] },
  { id: 'cafe', name: 'カフェ青空', category: 'カフェ', benefit: 'ドリンク100円引き', emoji: '☕', area: '近畿大学 東門付近', address: '大阪府東大阪市○○2-4-6', hours: '9:00〜20:00', holiday: '水曜定休', conditions: ['1人1回まで', '他クーポンとの併用不可'] },
  { id: 'gym', name: 'フィットネス24', category: 'ジム', benefit: '初回体験無料', emoji: '💪', area: '近畿大学 徒歩5分', address: '大阪府東大阪市○○3-1-1', hours: '24時間営業', holiday: '年中無休', conditions: ['初回のみ', '学生証提示が必要', '要事前予約'] },
  { id: 'tako', name: 'たこ焼き丸', category: '飲食', benefit: '100円引き', emoji: '🐙', area: '近畿大学 正門前', address: '大阪府東大阪市○○1-5-8', hours: '11:00〜21:00', holiday: '不定休', conditions: ['1人1回まで', '他クーポンとの併用不可'] },
  { id: 'yakiniku', name: '焼肉炎', category: '焼肉', benefit: 'ソフトドリンク無料', emoji: '🥩', area: '近畿大学 徒歩8分', address: '大阪府東大阪市○○4-2-2', hours: '17:00〜24:00', holiday: '月曜定休', conditions: ['1グループ1回まで', '飲食利用が必要', '学生証提示が必要'] },
  { id: 'furugi', name: '古着BASE', category: 'ショップ', benefit: '5%OFF', emoji: '👕', area: '近畿大学 東門付近', address: '大阪府東大阪市○○2-7-3', hours: '12:00〜20:00', holiday: '火曜定休', conditions: ['1会計1回まで', 'セール品は対象外'] },
  { id: 'bakery', name: 'ベーカリー小麦', category: 'ベーカリー', benefit: 'パン1個プレゼント', emoji: '🥐', area: '近畿大学 西門付近', address: '大阪府東大阪市○○1-3-9', hours: '7:00〜19:00', holiday: '日曜定休', conditions: ['1人1回まで', '対象商品のみ'] },
  { id: 'hair', name: 'ヘアサロンLien', category: '美容・サロン', benefit: '10%OFF', emoji: '💇', area: '近畿大学 徒歩10分', address: '大阪府東大阪市○○5-6-1', hours: '10:00〜19:00', holiday: '火曜定休', conditions: ['1人1回まで', '要事前予約', '他クーポンとの併用不可'] },
]

export function sponsorById(id: string): Sponsor | undefined {
  return SPONSORS.find((s) => s.id === id)
}
