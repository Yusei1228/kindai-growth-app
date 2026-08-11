// ===== 時間帯（昼 / 夕暮れ / 夜）=====
// 実時間に応じて背景シーンを切り替える。localStorage 'tod-override' があれば強制（検証用）。
export type TimeOfDay = 'day' | 'sunset' | 'night'

export function timeOfDay(): TimeOfDay {
  try {
    const o = localStorage.getItem('tod-override')
    if (o === 'day' || o === 'sunset' || o === 'night') return o
  } catch {
    /* noop */
  }
  const h = new Date().getHours()
  if (h >= 5 && h < 16) return 'day' // 5:00〜16:00 昼
  if (h >= 16 && h < 19) return 'sunset' // 16:00〜19:00 夕暮れ
  return 'night' // 19:00〜5:00 夜
}

export const SCENE_IMAGE: Record<TimeOfDay, string> = {
  day: '/bg-campus.webp',
  sunset: '/bg-ranking.webp',
  night: '/bg-night.webp',
}
