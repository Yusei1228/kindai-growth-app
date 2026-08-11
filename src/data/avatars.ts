// ===== 選べるアバター画像の一覧 =====
// public/ に置いた画像ファイル名を列挙する。
// ここに載せたファイルが「アバター選択画面」に候補として並ぶ。
// 実際に public/ に存在する画像だけが表示される（無いものは自動で隠れる）。

export interface AvatarOption {
  file: string // public/ 直下のファイル名
  label: string
}

// 表示順：男女を交互にし、派手色（ピンク/マルチカラー/明色）が隣り合わず散らばるように配置。
// ラベルは並び順の連番（アバター1,2,3…）で自動採番する。
// 女=hero,5,8,11,12,14,15,17,18,20 / 男=2,3,4,6,7,9,10,21,22
const AVATAR_FILES: string[] = [
  'avatar-5.webp',    // 女・ピンク
  'avatar-2.webp',    // 男・黒
  'hero-avatar.png',  // 女・黒
  'avatar-22.webp',   // 男・白/明
  'avatar-11.webp',   // 女・黒(ゴシック)
  'avatar-3.webp',    // 男・黒パーカー
  'avatar-12.webp',   // 女・マルチカラー
  'avatar-4.webp',    // 男・黒
  'avatar-14.webp',   // 女・黒/紫
  'avatar-7.webp',    // 男・茶/ベージュ
  'avatar-8.webp',    // 女・黒/赤
  'avatar-6.webp',    // 男・黒/紺
  'avatar-17.webp',   // 女・マルチカラー
  'avatar-9.webp',    // 男・暗/青髪
  'avatar-15.webp',   // 女・黒
  'avatar-10.webp',   // 男・灰/白
  'avatar-18.webp',   // 女・黒
  'avatar-21.webp',   // 男・黒
  'avatar-20.webp',   // 女・白/水色
]

// 表示ラベルは「並び順の連番」にする（1,2,3… と詰める）
export const AVATARS: AvatarOption[] = AVATAR_FILES.map((file, i) => ({
  file,
  label: `アバター${i + 1}`,
}))

// 新規ユーザーの既定アバター（並び順とは独立に固定）
export const DEFAULT_AVATAR = 'hero-avatar.png'

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
