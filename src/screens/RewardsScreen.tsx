import { useApp } from '../store'
import { PageHead, PointIcon } from '../components/ui'
import type { Route } from '../App'

export function RewardsScreen({ go, notify }: { go: (r: Route) => void; notify: (m: string) => void }) {
  const { state, redeemCoupon } = useApp()

  const redeem = (id: string, cost: number) => {
    if (state.user.points < cost) {
      notify('ポイントが足りません')
      return
    }
    if (redeemCoupon(id)) notify('クーポンを引き換えました！店頭で提示してください 🎫')
  }

  return (
    <>
      <PageHead title="協賛店舗・報酬" onBack={() => go({ name: 'mypage' })} />

      <div className="section-card row between">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>利用可能ポイント</div>
          <div className="bold" style={{ fontSize: 24 }}>{state.user.points.toLocaleString()} P</div>
        </div>
        <PointIcon />
      </div>

      <p className="hint">努力で貯めたポイントを、近大周辺の協賛店舗クーポンに交換できます。「頑張った人ほど学生生活が得になる」</p>

      <div className="section-title">近大周辺の協賛店舗</div>
      {state.coupons.map((c) => {
        const cannot = state.user.points < c.cost
        return (
          <div className="coupon" key={c.id}>
            <div className="emo">{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <div className="cname">{c.name}</div>
              <div className="ctitle">{c.title}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{c.category}・{c.distance}・{c.cost}P</div>
            </div>
            {c.redeemed ? (
              <button className="cbtn redeemed" disabled>引換済 ✓</button>
            ) : (
              <button className="cbtn" disabled={cannot} onClick={() => redeem(c.id, c.cost)}>
                {cannot ? '不足' : '交換'}
              </button>
            )}
          </div>
        )
      })}

      <p className="hint center">クーポン利用は店頭提示でカウントされ、協賛店舗の効果測定に使われます。</p>
    </>
  )
}
