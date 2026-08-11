// ===== 選べるアバター画像の一覧 =====
// public/ に置いた画像ファイル名を列挙する。
// ここに載せたファイルが「アバター選択画面」に候補として並ぶ。
// 実際に public/ に存在する画像だけが表示される（無いものは自動で隠れる）。

export interface AvatarOption {
  file: string // public/ 直下のファイル名
  label: string
}

export const AVATARS: AvatarOption[] = [
  { file: 'hero-avatar.png', label: 'アバター1' },
  { file: 'avatar-2.webp', label: 'アバター2' },
  { file: 'avatar-3.webp', label: 'アバター3' },
  { file: 'avatar-4.webp', label: 'アバター4' },
  { file: 'avatar-5.webp', label: 'アバター5' },
  { file: 'avatar-6.webp', label: 'アバター6' },
]

export const DEFAULT_AVATAR = AVATARS[0].file

/** 保存された値が候補に無ければデフォルトに寄せる */
export function normalizeAvatar(file: string | undefined): string {
  if (file && AVATARS.some((a) => a.file === file)) return file
  return DEFAULT_AVATAR
}
