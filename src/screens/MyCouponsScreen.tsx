import { useEffect, useMemo, useState } from 'react'
import { PageHead } from '../components/ui'
import { getCoupons, couponStatus, type Coupon, type CouponStatus } from '../lib/rewards'
import type { Route } from '../App'

const TABS: CouponStatus[] = ['未使用', '使用済み', '期限切れ']

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function MyCouponsScreen({ go, back }: { go: (r: Route) => void; back: () => void }) {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const [tab, setTab] = useState<CouponStatus>('未使用')

  useEffect(() => {
    ;(async () => setCoupons(await getCoupons()))()
  }, [])

  const counts = useMemo(() => {
    const c = { 未使用: 0, 使用済み: 0, 期限切れ: 0 } as Record<CouponStatus, number>
    for (const cp of coupons ?? []) c[couponStatus(cp)]++
    return c
  }, [coupons])

  const shown = (coupons ?? []).filter((c) => couponStatus(c) === tab)

  return (
    <>
      <PageHead title="マイクーポン" onBack={back} />

      <div className="rw-stat-row">
        {TABS.map((t) => (
          <div className={'rw-stat' + (tab === t ? ' on' : '')} key={t} onClick={() => setTab(t)}>
            <div className="rw-stat-lab">{t}</div>
            <div className="rw-stat-num">{counts[t]}<span> 枚</span></div>
          </div>
        ))}
      </div>

      <div className="rw-tabs">
        {TABS.map((t) => (
          <button key={t} className={'rw-tab' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
            {t}{counts[t] > 0 && <span className="rw-tab-badge">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {coupons === null && <p className="muted center" style={{ marginTop: 30 }}>読み込み中…</p>}
      {coupons !== null && shown.length === 0 && (
        <p className="muted center" style={{ marginTop: 30, fontSize: 13 }}>{tab}のクーポンはありません</p>
      )}

      {shown.map((c) => {
        const st = couponStatus(c)
        return (
          <div className={'rw-coupon' + (st !== '未使用' ? ' dim' : '')} key={c.id}>
            <div className="rw-coupon-emoji">{c.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="muted" style={{ fontSize: 11 }}>{c.sponsor_name}</div>
              <div className="bold" style={{ fontSize: 15 }}>{c.title}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>● 有効期限：{fmtDate(c.expires_at)}まで</div>
            </div>
            {st === '未使用' ? (
              <button className="rw-use-btn" onClick={() => go({ name: 'coupon-use', coupon: c })}>利用する</button>
            ) : (
              <span className={'rw-coupon-tag ' + (st === '使用済み' ? 'used' : 'expired')}>{st}</span>
            )}
          </div>
        )
      })}
    </>
  )
}
