import { PageHead } from '../components/ui'
import { sponsorById } from '../data/sponsors'

export function SponsorDetailScreen({ id, back }: { id: string; back: () => void }) {
  const s = sponsorById(id)
  if (!s) {
    return (
      <>
        <PageHead title="店舗詳細" onBack={back} />
        <p className="muted center" style={{ marginTop: 30 }}>店舗が見つかりませんでした</p>
      </>
    )
  }
  return (
    <>
      <PageHead title="店舗詳細" onBack={back} />

      <div className="rw-detail-hero">{s.emoji}</div>

      <div className="row between" style={{ marginTop: 12 }}>
        <div className="bold" style={{ fontSize: 20 }}>{s.name}</div>
        <span className="rw-detail-badge">協賛店舗</span>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>🏷 {s.category}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>📍 {s.area}</div>

      <div className="section-title">特典内容</div>
      <div className="section-card center rw-benefit">{s.benefit}</div>
      <p className="hint">ⓘ 抽選ガチャで当たったクーポンを、注文時にクーポン画面で提示してください</p>

      <div className="section-title">利用条件</div>
      <div className="section-card">
        <ul className="rw-cond">
          {s.conditions.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="section-title">店舗情報</div>
      <div className="section-card">
        <div className="rw-info-row">📍 {s.address}</div>
        <div className="rw-info-row">🕒 {s.hours}</div>
        <div className="rw-info-row">📅 {s.holiday}</div>
      </div>
    </>
  )
}
