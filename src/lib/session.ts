// ===== 匿名セッション（認証A案）=====
// ニックネーム＋UUID発行＋localStorage保持。個人情報は一切保存しない。

const UID_KEY = 'kindai-growth-uid'

/** localStorage の user_id を取得（無ければ生成して保存） */
export function getUserId(): string {
  let id = localStorage.getItem(UID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(UID_KEY, id)
  }
  return id
}

/** 既に user_id を持っているか（＝過去に生成済みか） */
export function hasUserId(): boolean {
  return !!localStorage.getItem(UID_KEY)
}

export function clearUserId(): void {
  localStorage.removeItem(UID_KEY)
}
