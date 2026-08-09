import { useState, useCallback } from 'react'
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
import { ReflectionScreen } from './screens/ReflectionScreen'
import { MyPageScreen } from './screens/MyPageScreen'
import { RewardsScreen } from './screens/RewardsScreen'
import { BottomNav, type Tab } from './components/BottomNav'
import type { ActiveMission } from './data/types'

export type Route =
  | { name: 'home' }
  | { name: 'avatar' }
  | { name: 'daily' }
  | { name: 'self' }
  | { name: 'timer'; mission: ActiveMission }
  | { name: 'review'; mission: ActiveMission; minutes: number }
  | { name: 'ranking' }
  | { name: 'reflection' }
  | { name: 'mypage' }
  | { name: 'rewards' }

const TAB_OF: Partial<Record<Route['name'], Tab>> = {
  home: 'home',
  avatar: 'home',
  daily: 'home',
  self: 'home',
  timer: 'home',
  review: 'home',
  ranking: 'ranking',
  reflection: 'reflection',
  mypage: 'mypage',
  rewards: 'mypage',
}

function initialRoute(): Route {
  const h = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
  if (h === 'self') return { name: 'self' }
  if (h === 'daily') return { name: 'daily' }
  if (h === 'ranking') return { name: 'ranking' }
  if (h === 'mypage') return { name: 'mypage' }
  if (h === 'reflection') return { name: 'reflection' }
  return { name: 'home' }
}

export function App() {
  const { state } = useApp()
  const [route, setRoute] = useState<Route>(initialRoute)
  const [toast, setToast] = useState<string | null>(null)
  const [levelUp, setLevelUp] = useState<number | null>(null)

  const go = useCallback((r: Route) => setRoute(r), [])
  const notify = useCallback((m: string) => setToast(m), [])

  // ニックネーム未登録なら登録画面を全画面表示
  if (!state.user.registered) {
    return (
      <div className="app-shell">
        <div className="phone">
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
      screen = <DailyMissionScreen go={go} />
      break
    case 'avatar':
      screen = <AvatarSelectScreen go={go} notify={notify} />
      break
    case 'self':
      screen = <SelfMissionScreen go={go} />
      break
    case 'timer':
      screen = <TimerScreen mission={route.mission} go={go} />
      break
    case 'review':
      screen = (
        <ReviewScreen
          mission={route.mission}
          minutes={route.minutes}
          go={go}
          notify={notify}
          onLevelUp={setLevelUp}
        />
      )
      break
    case 'ranking':
      screen = <RankingScreen />
      break
    case 'reflection':
      screen = <ReflectionScreen />
      break
    case 'mypage':
      screen = <MyPageScreen go={go} />
      break
    case 'rewards':
      screen = <RewardsScreen go={go} notify={notify} />
      break
  }

  const showNav = !['timer', 'review'].includes(route.name)

  return (
    <div className="app-shell">
      <div className="phone">
        <SceneBackground />
        <div className={'screen-scroll' + (route.name === 'home' ? ' home-fit' : '') + (route.name === 'self' ? ' self-fit' : '')} key={route.name}>
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
