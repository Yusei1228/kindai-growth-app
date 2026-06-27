import type { AppState } from './types'

// 設計画像（Lv.23 / 連続45日 / SP2,350 / P710 / 体力78 知力82 活力74 魅力69）を初期値に再現
export const seedState: AppState = {
  user: {
    name: 'Yusei',
    level: 23,
    exp: 540, // あと少しで次のレベル（演出用）
    streak: 45,
    totalDays: 128,
    sp: 2350,
    points: 710,
    stats: { 体力: 78, 知力: 82, 活力: 74, 魅力: 69 },
    dailyRewardAvailable: true,
  },
  missions: [
    {
      id: 'm1',
      title: '勉強10分',
      category: '勉強',
      targetMinutes: 10,
      reward: { exp: 10, sp: 10, coins: 5, stat: '知力', statAmount: 1 },
      done: false,
    },
    {
      id: 'm2',
      title: 'ストレッチ5分',
      category: '運動',
      targetMinutes: 5,
      reward: { exp: 5, sp: 5, coins: 3, stat: '体力', statAmount: 1 },
      done: false,
    },
    {
      id: 'm3',
      title: '日記を書く',
      category: '生活習慣',
      targetMinutes: 5,
      reward: { exp: 5, sp: 5, coins: 3, stat: '活力', statAmount: 1 },
      done: false,
    },
  ],
  logs: [
    {
      id: 'l0',
      missionTitle: 'TOEIC単語',
      category: '勉強',
      minutes: 30,
      spEarned: 60,
      rating: 4,
      comment: '昨日の記録',
      date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      at: Date.now() - 86400000,
    },
  ],
  friends: [
    { id: 'f1', name: 'Sakura', level: 26, faculty: '文芸学部', weeklySP: 2580, avatarColor: '#f472b6' },
    { id: 'f2', name: 'Haruto', level: 21, faculty: '経済学部', weeklySP: 1940, avatarColor: '#60a5fa' },
    { id: 'f3', name: 'Mei', level: 19, faculty: '理工学部', weeklySP: 1610, avatarColor: '#34d399' },
    { id: 'f4', name: 'Ren', level: 24, faculty: '経営学部', weeklySP: 2210, avatarColor: '#fbbf24' },
    { id: 'f5', name: 'Aoi', level: 17, faculty: '文芸学部', weeklySP: 1320, avatarColor: '#a78bfa' },
  ],
  // 学内ランキング用の母集団（自分は store 側でマージ）
  ranking: [
    { id: 'u1', name: 'Kenta', level: 31, faculty: '経済学部', weeklySP: 3120, monthlySP: 11800 },
    { id: 'u2', name: 'Sakura', level: 26, faculty: '文芸学部', weeklySP: 2580, monthlySP: 9700 },
    { id: 'u3', name: 'Ren', level: 24, faculty: '経営学部', weeklySP: 2210, monthlySP: 8600 },
    { id: 'u4', name: 'Yuki', level: 28, faculty: '理工学部', weeklySP: 2740, monthlySP: 10200 },
    { id: 'u5', name: 'Haruto', level: 21, faculty: '経済学部', weeklySP: 1940, monthlySP: 7300 },
    { id: 'u6', name: 'Nao', level: 22, faculty: '経済学部', weeklySP: 2050, monthlySP: 7900 },
    { id: 'u7', name: 'Mei', level: 19, faculty: '理工学部', weeklySP: 1610, monthlySP: 6100 },
    { id: 'u8', name: 'Sora', level: 30, faculty: '経営学部', weeklySP: 2890, monthlySP: 10800 },
    { id: 'u9', name: 'Aoi', level: 17, faculty: '文芸学部', weeklySP: 1320, monthlySP: 5200 },
    { id: 'u10', name: 'Riku', level: 25, faculty: '農学部', weeklySP: 2380, monthlySP: 9100 },
  ],
  coupons: [
    { id: 'c1', name: '学食横カフェ Mahoroba', category: 'カフェ', title: 'ドリンク100円引き', cost: 300, emoji: '☕', distance: '120m', redeemed: false },
    { id: 'c2', name: '定食屋 まんぷく亭', category: '飲食', title: '大盛り無料', cost: 200, emoji: '🍚', distance: '230m', redeemed: false },
    { id: 'c3', name: 'ジム KINDAI FIT', category: 'フィットネス', title: '1日体験500円OFF', cost: 500, emoji: '💪', distance: '400m', redeemed: false },
    { id: 'c4', name: '本屋 ブックス近大前', category: '書店', title: '参考書10%OFF', cost: 450, emoji: '📚', distance: '180m', redeemed: false },
    { id: 'c5', name: 'タピオカ Q-Tea', category: 'カフェ', title: 'トッピング1つ無料', cost: 150, emoji: '🧋', distance: '90m', redeemed: false },
  ],
  challengeDaysLeft: 6,
}
