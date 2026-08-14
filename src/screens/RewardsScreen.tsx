import { useEffect, useState } from 'react'
import { PageHead } from '../components/ui'
import { SPONSORS } from '../data/sponsors'
import { getSummary, rewardsAvailable, type RewardSummary } from '../lib/rewards'
import type { Route } from '../App'

export function RewardsScreen({ go, back }: { go: (r: Route) => void; back: () => void; notify: (m: string) => void }) {
  const [summary, setSummary] = useState<RewardSummary | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const ok = await rewardsAvailable()
      if (!alive) return
      setAvailable(ok)
      if (ok) setSummary(await getSummary())
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <>
      <PageHead title="報酬" onBack={back} />
      <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>協賛ページ</div>

      {available === false && (
        <div className="info-note" style={{ marginTop: 12 }}>
          ⓘ 報酬機能の準備中です（サーバー設定の反映待ち）。少し時間をおいて再度お試しください。
        </div>
      )}

      {/* ガチャCTA（抽選券の残数） */}
      <button className="rw-gacha-cta" onClick={() => go({ name: 'tickets' })}>
        <div className="rw-gacha-emoji">🎰</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div className="bold" style={{ fontSize: 15 }}>抽選ガチャを回す</div>
          <div style={{ fontSize: 12, opacity: 0.92 }}>ミッション達成で貯めた抽選券でクーポンをGET</div>
        </div>
        <div className="rw-ticket-badge">🎟️ {summary?.balance ?? 0}</div>
      </button>

      {/* 3タイル */}
      <div className="rw-tiles">
        <button className="rw-tile" onClick={() => go({ name: 'sponsors' })}>
          <span className="rw-tile-ico">🏬</span>
          <span>協賛店舗<br />一覧</span>
        </button>
        <button className="rw-tile" onClick={() => go({ name: 'tickets' })}>
          <span className="rw-tile-ico">🎟️</span>
          <span>所持<br />チケット</span>
          {!!summary?.balance && <span className="rw-tile-badge">{summary.balance}</span>}
        </button>
        <button className="rw-tile" onClick={() => go({ name: 'reward-box' })}>
          <span className="rw-tile-ico">🎁</span>
          <span>受け取り<br />BOX</span>
          {!!summary?.boxCount && <span className="rw-tile-badge">{summary.boxCount}</span>}
        </button>
      </div>

      <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => go({ name: 'my-coupons' })}>🎫 マイクーポン（獲得したクーポン）</button>

      <div className="section-title row between">
        <span>おすすめ協賛店舗</span>
        <button className="rw-link" onClick={() => go({ name: 'sponsors' })}>すべて見る ›</button>
      </div>

      <div className="rw-shop-grid">
        {SPONSORS.slice(0, 6).map((s) => (
          <button className="rw-shop" key={s.id} onClick={() => go({ name: 'sponsor', id: s.id })}>
            <div className="rw-shop-emoji">{s.emoji}</div>
            <div className="rw-shop-name">{s.name}</div>
            <div className="rw-shop-cat">{s.category}</div>
            <div className="rw-shop-benefit">{s.benefit}</div>
            <div className="rw-shop-more">詳細 ›</div>
          </button>
        ))}
      </div>

      <p className="hint center">抽選券は「その日ミッションを1つでも達成」でもらえます（1日1枚・週最大7枚）。</p>
    </>
  )
}
