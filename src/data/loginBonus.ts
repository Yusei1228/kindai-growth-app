// ===== ログインボーナス =====
// 毎月30日分。ログインして受け取るごとに、日を追うごとにSP/EXPが増えていく。
// 7日ごと（7/14/21/28）と最終日30日は「マイルストーン」で追加ボーナス。

export const LOGIN_BONUS_DAYS = 30

export interface LoginBonusReward {
  sp: number
  exp: number
  milestone: boolean
}

/** 日目(1〜30)ごとの報酬。徐々に増加＋節目に加算 */
export function loginBonusReward(day: number): LoginBonusReward {
  const d = Math.min(LOGIN_BONUS_DAYS, Math.max(1, day))
  const sp = 20 + (d - 1) * 10 // 1日目20 → 30日目310
  const exp = 10 + (d - 1) * 5 // 1日目10 → 30日目155
  const milestone = d % 7 === 0 || d === LOGIN_BONUS_DAYS
  return {
    sp: sp + (milestone ? 100 : 0),
    exp: exp + (milestone ? 50 : 0),
    milestone,
  }
}

/** app_date('YYYY-MM-DD') から月キー('YYYY-MM') */
export function loginMonthKey(appDateStr: string): string {
  return appDateStr.slice(0, 7)
}
