import { PageHead } from '../components/ui'
import { SPONSORS } from '../data/sponsors'
import type { Route } from '../App'

export function SponsorListScreen({ go, back }: { go: (r: Route) => void; back: () => void }) {
  return (
    <>
      <PageHead title="協賛店舗一覧" onBack={back} />
      <p className="hint">近大周辺の協賛店舗です。ミッションを達成して抽選券を貯め、ガチャでクーポンを当てよう。</p>
      <div className="rw-shop-grid">
        {SPONSORS.map((s) => (
          <button className="rw-shop" key={s.id} onClick={() => go({ name: 'sponsor', id: s.id })}>
            <div className="rw-shop-emoji">{s.emoji}</div>
            <div className="rw-shop-name">{s.name}</div>
            <div className="rw-shop-cat">{s.category}</div>
            <div className="rw-shop-benefit">{s.benefit}</div>
            <div className="rw-shop-more">詳細 ›</div>
          </button>
        ))}
      </div>
    </>
  )
}
