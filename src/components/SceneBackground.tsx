// アプリ全体の背景。時間帯(昼/夕/夜)で実画像を切替。無ければ下のSVGシーンにフォールバック。
import { useState } from 'react'
import { timeOfDay, SCENE_IMAGE, type TimeOfDay } from '../lib/timeOfDay'

// 舞う粒子（軽量CSSアニメ）。位置/速度は固定でばらけさせ、絵柄は時間帯で切替。
const PETALS = [
  { left: 6, size: 16, delay: 0, dur: 9, sway: 26 },
  { left: 18, size: 12, delay: 2.4, dur: 11, sway: -30 },
  { left: 30, size: 18, delay: 4.1, dur: 8.5, sway: 34 },
  { left: 42, size: 13, delay: 1.2, dur: 12, sway: -22 },
  { left: 54, size: 15, delay: 5.6, dur: 10, sway: 30 },
  { left: 66, size: 11, delay: 3.0, dur: 13, sway: -34 },
  { left: 76, size: 17, delay: 6.8, dur: 9.5, sway: 24 },
  { left: 86, size: 13, delay: 0.8, dur: 11.5, sway: -28 },
  { left: 94, size: 15, delay: 4.8, dur: 8, sway: 20 },
  { left: 12, size: 10, delay: 7.5, dur: 12.5, sway: 32 },
  { left: 48, size: 12, delay: 8.2, dur: 10.5, sway: -26 },
  { left: 70, size: 14, delay: 2.0, dur: 9, sway: 28 },
]

// 時間帯ごとの舞う絵柄（昼=桜/葉、夕=桜/紅葉、夜=青い光の粒）
const PARTICLE_SET: Record<TimeOfDay, string[]> = {
  day: ['🌸', '🌸', '🍃'],
  sunset: ['🌸', '🍂'],
  night: ['✦', '🔹', '✧'],
}

function Petals({ tod }: { tod: TimeOfDay }) {
  const set = PARTICLE_SET[tod]
  return (
    <div className={'petals petals-' + tod} aria-hidden="true">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: p.left + '%',
            fontSize: p.size + 'px',
            animationDelay: p.delay + 's',
            animationDuration: p.dur + 's',
            ['--sway' as string]: p.sway + 'px',
          }}
        >
          {set[i % set.length]}
        </span>
      ))}
    </div>
  )
}

export function SceneBackground({ mode = 'scene' }: { mode?: 'scene' | 'ranking' }) {
  const [failed, setFailed] = useState(false)
  const tod = timeOfDay()
  if (failed) return <SceneSVG />

  // ランキング：現在の時間帯シーンの上に夕焼けを数秒かけてフェードイン（夜→夕/昼→夕）＋花びら
  if (mode === 'ranking') {
    return (
      <div className="scene-bg" aria-hidden="true">
        <img src={SCENE_IMAGE[tod]} className="scene-img" alt="" onError={() => setFailed(true)} />
        <img src="/bg-ranking.webp" className="scene-img scene-sunset" alt="" />
        <div className="scene-tint tod-sunset" />
        <Petals tod="sunset" />
        <div className="scene-scrim" />
      </div>
    )
  }

  // 通常画面：時間帯に応じたシーン＋時間帯グラデ＋その時間帯の花びら
  return (
    <div className="scene-bg" aria-hidden="true">
      <img src={SCENE_IMAGE[tod]} className="scene-img" alt="" onError={() => setFailed(true)} />
      <div className={'scene-tint tod-' + tod} />
      <Petals tod={tod} />
      <div className="scene-scrim" />
    </div>
  )
}

// 実画像が無い場合のSVG背景（青空・雲・街並み・木々・キラキラ）
function SceneSVG() {
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
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0.6" stopColor="#0f172a" stopOpacity="0" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0.14" />
        </radialGradient>
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

      {/* 横方向の大気ヘイズ（遠近感） */}
      <rect x="0" y="430" width="430" height="150" fill="url(#haze)" />

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
        <ellipse cx="330" cy="300" rx="38" ry="13" opacity="0.6" />
        <ellipse cx="60" cy="360" rx="42" ry="14" opacity="0.55" />
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
      {/* 全体のビネット（縁を締めて立体感） */}
      <rect width="430" height="900" fill="url(#vignette)" />
    </svg>
  )
}
