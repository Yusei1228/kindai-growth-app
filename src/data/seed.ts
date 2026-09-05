import type { AppState } from './types'
import { DEFAULT_AVATAR } from './avatars'

// 検証版: 新規ユーザーはニックネーム未登録・Lv1・ステータス20からスタート。
// missions は store 側で当日分を自動生成する（missionsDate='' で必ず再生成）。
export const seedState: AppState = {
  user: {
    userId: '',
    registered: false,
    name: '',
    avatar: DEFAULT_AVATAR,
    level: 1,
    exp: 0,
    streak: 0,
    totalDays: 0,
    sp: 0,
    points: 0,
    stats: { 体力: 20, 知力: 20, 活力: 20, 魅力: 20 },
    dailyRewardAvailable: true,
    tutorialDone: false,
  },
  missions: [],
  missionsDate: '',
  logs: [],
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
  loginBonus: { monthKey: '', claimedDays: 0, lastClaimDate: '' },
  lifeMap: { routeId: null, progress: {}, history: [], rollDay: '', rollsUsed: 0 },
}
