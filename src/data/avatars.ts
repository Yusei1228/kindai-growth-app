// ===== 選べるアバター画像の一覧 =====
// public/ に置いた画像ファイル名を列挙する。
// ここに載せたファイルが「アバター選択画面」に候補として並ぶ。
// 実際に public/ に存在する画像だけが表示される（無いものは自動で隠れる）。

export interface AvatarOption {
  file: string // public/ 直下のファイル名
  label: string
}

// 除外するアバター番号（ファイルも削除済み）
const EXCLUDED = new Set([13, 16, 19])

// 実在するアバターファイルの並び（hero=1枚目 + avatar-2〜20 のうち除外を除く）
const AVATAR_FILES: string[] = [
  'hero-avatar.png',
  ...Array.from({ length: 19 }, (_, i) => i + 2) // 2〜20
    .filter((n) => !EXCLUDED.has(n))
    .map((n) => `avatar-${n}.webp`),
]

// 表示ラベルは「並び順の連番」にする（ファイル番号の欠番があっても 1,2,3… と詰める）
export const AVATARS: AvatarOption[] = AVATAR_FILES.map((file, i) => ({
  file,
  label: `アバター${i + 1}`,
}))

export const DEFAULT_AVATAR = AVATARS[0].file

// 旧ファイル名（png）→ 現行（webp）への移行マップ。
// 以前 avatar-2/3 を選んでいたユーザーの保存値を自動で読み替える。
const LEGACY_RENAME: Record<string, string> = {
  'avatar-2.png': 'avatar-2.webp',
  'avatar-3.png': 'avatar-3.webp',
}

/** 保存された値を現行の候補に正規化する（旧png名は自動移行・不明ならデフォルト） */
export function normalizeAvatar(file: string | undefined): string {
  if (!file) return DEFAULT_AVATAR
  const migrated = LEGACY_RENAME[file] ?? file
  if (AVATARS.some((a) => a.file === migrated)) return migrated
  return DEFAULT_AVATAR
}
