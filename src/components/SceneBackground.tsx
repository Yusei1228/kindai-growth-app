// アプリ全体の背景シーン（青空・雲・太陽光・キャンパスの街並み・木々・キラキラ）
// ホーム画面モックの世界観を、UIカードの背後に敷く固定レイヤーとして表現。
// 立体感: 空の後退グラデ → 遠景ビル → 近景ビル/時計塔 → 木々 → 手前の広場、の奥行き構成。

export function SceneBackground() {
  return (
    <svg className="scene-bg" viewBox="0 0 430 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fb7ef" />
          <stop offset="0.26" stopColor="#9ed3f6" />
          <stop offset="0.52" stopColor="#c7e5fd" />
          <stop offset="0.76" stopColor="#e6f3ff" />
          <stop offset="1" stopColor="#f2f9ff" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="topScrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="plaza" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9eef4" />
          <stop offset="1" stopColor="#d7e0ea" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe1f6" />
          <stop offset="1" stopColor="#aecbec" />
        </linearGradient>
        <linearGradient id="tree" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ad79b" />
          <stop offset="1" stopColor="#6cb873" />
        </linearGradient>
        <filter id="cloudBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* 空 */}
      <rect width="430" height="900" fill="url(#skyGrad)" />
      {/* 太陽光のにじみ */}
      <circle cx="352" cy="112" r="210" fill="url(#sun)" />

      {/* 遠景スカイライン（低コントラスト） */}
      <g fill="#bcd8f2" opacity="0.55">
        <rect x="-10" y="486" width="60" height="150" rx="3" />
        <rect x="52" y="510" width="44" height="126" rx="3" />
        <rect x="330" y="500" width="52" height="136" rx="3" />
        <rect x="386" y="520" width="54" height="116" rx="3" />
      </g>

      {/* 近景ビル群 */}
      <g>
        {/* 左：時計塔（キャンパスの象徴） */}
        <rect x="40" y="470" width="52" height="180" rx="4" fill="url(#glass)" />
        <polygon points="36,470 96,470 66,438" fill="#9cc0e6" />
        <circle cx="66" cy="498" r="12" fill="#eef6ff" stroke="#8fb4dd" strokeWidth="2" />
        <line x1="66" y1="498" x2="66" y2="490" stroke="#6f95c4" strokeWidth="1.6" />
        <line x1="66" y1="498" x2="72" y2="500" stroke="#6f95c4" strokeWidth="1.6" />
        {/* ガラス張りの現代ビル */}
        <rect x="120" y="520" width="70" height="150" rx="4" fill="url(#glass)" />
        <rect x="250" y="505" width="64" height="165" rx="4" fill="url(#glass)" />
        <rect x="330" y="540" width="80" height="130" rx="4" fill="url(#glass)" />
        {/* 窓（淡い格子） */}
        <g fill="#ffffff" opacity="0.45">
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2].map((c) => <rect key={`a${r}-${c}`} x={128 + c * 20} y={532 + r * 30} width="12" height="18" rx="1.5" />),
          )}
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1].map((c) => <rect key={`b${r}-${c}`} x={260 + c * 24} y={518 + r * 28} width="14" height="18" rx="1.5" />),
          )}
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2].map((c) => <rect key={`c${r}-${c}`} x={340 + c * 22} y={552 + r * 26} width="13" height="16" rx="1.5" />),
          )}
        </g>
      </g>

      {/* 木々（左右の手前） */}
      <g opacity="0.95">
        <g fill="url(#tree)">
          <circle cx="24" cy="648" r="34" />
          <circle cx="58" cy="636" r="28" />
          <circle cx="44" cy="672" r="30" />
        </g>
        <g fill="url(#tree)">
          <circle cx="410" cy="656" r="34" />
          <circle cx="380" cy="640" r="26" />
          <circle cx="398" cy="680" r="28" />
        </g>
      </g>

      {/* 手前の広場 */}
      <rect x="0" y="694" width="430" height="206" fill="url(#plaza)" />
      <g stroke="#c7d2df" strokeWidth="1" opacity="0.5">
        <line x1="0" y1="740" x2="430" y2="740" />
        <line x1="0" y1="800" x2="430" y2="800" />
        <line x1="150" y1="694" x2="120" y2="900" />
        <line x1="280" y1="694" x2="310" y2="900" />
      </g>

      {/* 雲（ゆっくり流れる） */}
      <g className="scene-clouds" filter="url(#cloudBlur)" fill="#ffffff">
        <ellipse cx="78" cy="120" rx="50" ry="18" opacity="0.9" />
        <ellipse cx="150" cy="96" rx="34" ry="13" opacity="0.8" />
        <ellipse cx="300" cy="70" rx="54" ry="20" opacity="0.85" />
        <ellipse cx="372" cy="168" rx="40" ry="15" opacity="0.8" />
        <ellipse cx="112" cy="228" rx="44" ry="15" opacity="0.75" />
      </g>

      {/* キラキラ */}
      <g fill="#ffffff">
        <path className="spark" style={{ animationDelay: '0s' }} transform="translate(300,150)" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" />
        <path className="spark" style={{ animationDelay: '0.8s' }} transform="translate(360,90) scale(0.7)" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" />
        <path className="spark" style={{ animationDelay: '1.6s' }} transform="translate(90,70) scale(0.8)" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" />
        <path className="spark" style={{ animationDelay: '2.4s' }} transform="translate(210,200) scale(0.6)" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" />
        <path className="spark" style={{ animationDelay: '1.1s' }} transform="translate(40,300) scale(0.7)" d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6 Z" />
      </g>

      {/* 上部の可読性スクリム（ヘッダー文字を見やすく） */}
      <rect width="430" height="170" fill="url(#topScrim)" />
    </svg>
  )
}
