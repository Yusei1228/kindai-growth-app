import { useState } from 'react'

// public/hero-avatar.png / public/mini-avatar.png を置くと、その画像が使われます。
// 無い場合は下の簡易SVGアバターに自動フォールバックします。

// アバター画像は public/hero-avatar.png の1枚でOK。
// 大画像は上寄せ、丸アイコンは顔まわりが出るように上寄せクロップする。

/** ヒーローアバター（画像があれば画像、無ければSVG） */
export function HeroAvatar() {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return (
      <img
        src="/hero-avatar.png"
        alt="アバター"
        className="hero-img"
        style={{ objectFit: 'cover', objectPosition: 'center top' }}
        onError={() => setFailed(true)}
      />
    )
  }
  return <HeroAvatarSVG />
}

/** 小さい丸アバター（大画像と同じファイルの顔まわりを表示、無ければSVG） */
export function MiniAvatar() {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return (
      <img
        src="/hero-avatar.png"
        alt="プロフィール"
        className="avatar-sm"
        style={{ objectFit: 'cover', objectPosition: 'center 12%' }}
        onError={() => setFailed(true)}
      />
    )
  }
  return <MiniAvatarSVG />
}

/** 設計画像のキャラクターを模したスタイライズSVGアバター（街背景＋人物） */
function HeroAvatarSVG() {
  return (
    <svg viewBox="0 0 300 400" className="hero-img" preserveAspectRatio="xMidYMid slice" role="img" aria-label="アバター">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe8ff" />
          <stop offset="1" stopColor="#eaf6ff" />
        </linearGradient>
        <linearGradient id="jacket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      {/* 空 */}
      <rect width="300" height="400" fill="url(#sky)" />
      {/* 雲 */}
      <ellipse cx="60" cy="70" rx="34" ry="14" fill="#ffffff" opacity=".8" />
      <ellipse cx="240" cy="50" rx="40" ry="16" fill="#ffffff" opacity=".75" />
      {/* ビル群 */}
      <g fill="#bcd6f5" opacity=".85">
        <rect x="10" y="150" width="44" height="170" rx="3" />
        <rect x="60" y="120" width="40" height="200" rx="3" />
        <rect x="200" y="135" width="42" height="185" rx="3" />
        <rect x="248" y="160" width="40" height="160" rx="3" />
      </g>
      <g fill="#dcebfb">
        <rect x="105" y="175" width="36" height="145" rx="3" />
        <rect x="160" y="160" width="36" height="160" rx="3" />
      </g>
      {/* 窓 */}
      <g fill="#ffffff" opacity=".55">
        {[0, 1, 2, 3, 4].map((r) =>
          [0, 1].map((c) => <rect key={`${r}-${c}`} x={66 + c * 16} y={135 + r * 26} width="9" height="13" rx="1" />),
        )}
      </g>
      {/* 地面 */}
      <rect x="0" y="318" width="300" height="82" fill="#9ec19a" />
      <rect x="0" y="318" width="300" height="14" fill="#86b083" />
      {/* 人物：影 */}
      <ellipse cx="150" cy="372" rx="58" ry="12" fill="#000" opacity=".12" />
      {/* 脚 */}
      <rect x="124" y="300" width="22" height="78" rx="8" fill="#0f172a" />
      <rect x="154" y="300" width="22" height="78" rx="8" fill="#1e293b" />
      {/* 胴・ジャケット */}
      <path d="M108 210 Q150 195 192 210 L198 312 Q150 326 102 312 Z" fill="url(#jacket)" />
      {/* 白Tシャツ */}
      <path d="M132 206 L150 250 L168 206 L168 300 L132 300 Z" fill="#f1f5f9" />
      {/* 襟 */}
      <path d="M132 206 L150 246 L138 208 Z" fill="#0f172a" />
      <path d="M168 206 L150 246 L162 208 Z" fill="#0f172a" />
      {/* 首 */}
      <rect x="142" y="186" width="16" height="22" rx="6" fill="#f0c9a8" />
      {/* 顔 */}
      <ellipse cx="150" cy="166" rx="27" ry="30" fill="#f7d3b0" />
      {/* 髪 */}
      <path d="M122 158 Q120 124 150 122 Q182 124 178 158 Q172 142 150 142 Q150 150 140 150 Q132 150 130 158 Q126 150 122 158Z" fill="#1a1a1a" />
      <path d="M124 160 Q126 138 150 136 Q176 138 176 160 L176 150 Q150 142 124 150 Z" fill="#262626" />
      {/* 目 */}
      <ellipse cx="140" cy="166" rx="3.2" ry="4" fill="#3b2a1d" />
      <ellipse cx="160" cy="166" rx="3.2" ry="4" fill="#3b2a1d" />
      {/* 眉 */}
      <rect x="135" y="158" width="10" height="2.2" rx="1" fill="#2a2a2a" />
      <rect x="155" y="158" width="10" height="2.2" rx="1" fill="#2a2a2a" />
      {/* 口 */}
      <path d="M144 180 Q150 184 156 180" stroke="#9a5a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* リュック紐 */}
      <path d="M128 210 L122 300" stroke="#0b1220" strokeWidth="7" strokeLinecap="round" />
      <path d="M172 210 L178 300" stroke="#0b1220" strokeWidth="7" strokeLinecap="round" />
      {/* キラキラ */}
      <text x="248" y="120" fontSize="18" opacity=".8">✨</text>
      <text x="40" y="240" fontSize="14" opacity=".7">✨</text>
    </svg>
  )
}

/** 小さい丸アバター（プロフィール用・SVGフォールバック） */
function MiniAvatarSVG() {
  return (
    <svg className="avatar-sm" viewBox="0 0 56 56" role="img" aria-label="プロフィール">
      <rect width="56" height="56" rx="16" fill="#dbeafe" />
      <ellipse cx="28" cy="24" rx="11" ry="12" fill="#f7d3b0" />
      <path d="M16 22 Q16 8 28 8 Q40 8 40 22 Q35 15 28 15 Q21 15 16 22Z" fill="#1a1a1a" />
      <ellipse cx="24" cy="24" rx="1.6" ry="2" fill="#3b2a1d" />
      <ellipse cx="32" cy="24" rx="1.6" ry="2" fill="#3b2a1d" />
      <path d="M28 36 Q14 38 12 56 L44 56 Q42 38 28 36Z" fill="#334155" />
    </svg>
  )
}
