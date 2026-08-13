import { useState, useCallback, useRef, useEffect } from 'react'
import { useApp } from './store'
import { Toast } from './components/ui'
import { NicknameScreen } from './screens/NicknameScreen'
import { SceneBackground } from './components/SceneBackground'
import { HomeScreen } from './screens/HomeScreen'
import { AvatarSelectScreen } from './screens/AvatarSelectScreen'
import { DailyMissionScreen } from './screens/DailyMissionScreen'
import { SelfMissionScreen } from './screens/SelfMissionScreen'
import { TimerScreen } from './screens/TimerScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { RankingScreen } from './screens/RankingScreen'
import { UserProfileScreen } from './screens/UserProfileScreen'
import { ReflectionScreen } from './screens/ReflectionScreen'
import { MyPageScreen } from './screens/MyPageScreen'
import { RewardsScreen } from './screens/RewardsScreen'
import { LoginBonusScreen } from './screens/LoginBonusScreen'
import { TutorialScreen } from './screens/TutorialScreen'
import { BottomNav, type Tab } from './components/BottomNav'
import type { ActiveMission } from './data/types'
import type { RankRow } from './lib/api'
import { loadTimerSession } from './lib/timerSession'
import { timeOfDay } from './lib/timeOfDay'
import { installTapSound, playSound } from './lib/sound'

export type Route =
  | { name: 'home' }
  | { name: 'avatar' }
  | { name: 'daily' }
  | { name: 'tutorial' }
  | { name: 'self' }
  | { name: 'timer'; mission: ActiveMission }
  | { name: 'review'; mission: ActiveMission; minutes: number }
  | { name: 'ranking' }
  | { name: 'profile'; user: RankRow; rank: number; total: number; isMe: boolean }
  | { name: 'reflection' }
  | { name: 'mypage' }
  | { name: 'rewards' }
  | { name: 'login-bonus' }

const TAB_OF: Partial<Record<Route['name'], Tab>> = {
  home: 'home',
  avatar: 'home',
  daily: 'home',
  tutorial: 'home',
  self: 'home',
  timer: 'home',
  review: 'home',
  ranking: 'ranking',
  profile: 'ranking',
  reflection: 'reflection',
  mypage: 'mypage',
  rewards: 'mypage',
  'login-bonus': 'home',
}

function initialRoute(): Route {
  const h = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
  if (h === 'self') return { name: 'self' }
  if (h === 'daily') return { name: 'daily' }
  if (h === 'ranking') return { name: 'ranking' }
  if (h === 'mypage') return { name: 'mypage' }
  if (h === 'reflection') return { name: 'reflection' }
  if (h === 'login-bonus') return { name: 'login-bonus' }
  // 明示的な遷移先が無く、進行中タイマーが残っていれば続きから再開する
  const timer = loadTimerSession()
  if (timer && timer.mission) return { name: 'timer', mission: timer.mission }
  return { name: 'home' }
}

export function App() {
  const { state } = useApp()
  const [route, setRoute] = useState<Route>(initialRoute)
  const [toast, setToast] = useState<string | null>(null)
  const [levelUp, setLevelUp] = useState<number | null>(null)

  // 画面遷移の履歴スタック。← ボタンで「1つ前の画面」に戻れるようにする
  const historyRef = useRef<Route[]>([])
  const routeRef = useRef(route)
  routeRef.current = route

  const TAB_NAMES = ['home', 'ranking', 'reflection', 'mypage']

  const go = useCallback((r: Route) => {
    // タブのルート画面へ移動するときは履歴をリセット（トップ階層のため）
    if (TAB_NAMES.includes(r.name)) {
      historyRef.current = []
    } else {
      historyRef.current.push(routeRef.current)
    }
    setRoute(r)
  }, [])

  // ← ボタン：1つ前の画面へ。履歴が無ければホームへ
  const back = useCallback(() => {
    const prev = historyRef.current.pop()
    setRoute(prev ?? { name: 'home' })
  }, [])

  // 履歴に積まずに置き換える遷移（タイマー→レビュー→完了など、戻ると困る中間画面用）
  const replace = useCallback((r: Route) => setRoute(r), [])

  const notify = useCallback((m: string) => setToast(m), [])

  // 効果音：全ボタンの押下音を有効化＋レベルアップ演出時にファンファーレ
  useEffect(() => {
    installTapSound()
  }, [])
  useEffect(() => {
    if (levelUp !== null) playSound('levelup')
  }, [levelUp])

  // ニックネーム未登録なら登録画面を全画面表示
  if (!state.user.registered) {
    return (
      <div className="app-shell">
        <div className={'phone tod-' + timeOfDay()}>
          <SceneBackground />
          <div className="screen-scroll">
            <NicknameScreen />
          </div>
        </div>
      </div>
    )
  }

  const onTab = (t: Tab) => {
    if (t === 'home') go({ name: 'home' })
    if (t === 'ranking') go({ name: 'ranking' })
    if (t === 'reflection') go({ name: 'reflection' })
    if (t === 'mypage') go({ name: 'mypage' })
  }

  let screen: React.ReactNode = null
  switch (route.name) {
    case 'home':
      screen = <HomeScreen go={go} notify={notify} />
      break
    case 'daily':
      screen = <DailyMissionScreen go={go} back={back} />
      break
    case 'tutorial':
      screen = <TutorialScreen go={go} onLevelUp={setLevelUp} />
      break
    case 'avatar':
      screen = <AvatarSelectScreen back={back} notify={notify} />
      break
    case 'self':
      screen = <SelfMissionScreen go={go} back={back} />
      break
    case 'timer':
      screen = <TimerScreen mission={route.mission} back={back} replace={replace} />
      break
    case 'review':
      screen = (
        <ReviewScreen
          mission={route.mission}
          minutes={route.minutes}
          back={back}
          replace={replace}
          notify={notify}
          onLevelUp={setLevelUp}
        />
      )
      break
    case 'ranking':
      screen = <RankingScreen go={go} />
      break
    case 'profile':
      screen = <UserProfileScreen user={route.user} rank={route.rank} total={route.total} isMe={route.isMe} back={back} />
      break
    case 'reflection':
      screen = <ReflectionScreen />
      break
    case 'mypage':
      screen = <MyPageScreen go={go} />
      break
    case 'login-bonus':
      screen = <LoginBonusScreen back={back} onLevelUp={setLevelUp} />
      break
    case 'rewards':
      screen = <RewardsScreen back={back} notify={notify} />
      break
  }

  const showNav = !['timer', 'review', 'tutorial'].includes(route.name)

  const isRanking = route.name === 'ranking' || route.name === 'profile'
  // 画面内容の可読性用の時間帯（ランキングは夕焼けで固定、それ以外は実時間帯）
  const bodyTod = isRanking ? 'sunset' : timeOfDay()

  return (
    <div className="app-shell">
      <div className={'phone tod-' + bodyTod}>
        <SceneBackground key={isRanking ? 'ranking' : 'scene'} mode={isRanking ? 'ranking' : 'scene'} />
        <div className={'screen-scroll' + (route.name === 'home' ? ' home-fit' : '')} key={route.name}>
          {screen}
        </div>

        {showNav && <BottomNav active={TAB_OF[route.name] ?? 'home'} onTab={onTab} />}

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}

        {levelUp !== null && (
          <div className="overlay" onClick={() => setLevelUp(null)}>
            <div className="levelup" onClick={(e) => e.stopPropagation()}>
              <div className="big">🎉</div>
              <h2>LEVEL UP!</h2>
              <p className="bold" style={{ fontSize: 22, margin: '4px 0' }}>Lv.{levelUp}</p>
              <p className="muted" style={{ fontSize: 13 }}>努力がレベルになった！この調子で続けよう</p>
              <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => setLevelUp(null)}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
