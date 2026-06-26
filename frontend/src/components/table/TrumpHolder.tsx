import Card from '../Card'

// Ornate gold trump holder ported from Game Table.dc.html.

export default function TrumpHolder({ card }: { card: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'gtFloatBadge 5.5s ease-in-out infinite' }}>
      {/* Banner */}
      <div
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 16px',
          borderRadius: 7, background: 'linear-gradient(180deg,#ffe9a8,#d8a93e 55%,#b07d22)',
          boxShadow: '0 4px 12px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.6)',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="#5a3c0c"><path d="M5 16L3 5l5.5 4L12 4l3.5 5L21 5l-2 11z" /></svg>
        <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 800, fontSize: 12, letterSpacing: '0.18em', color: '#4a3208' }}>TRUMP</span>
      </div>
      {/* Card in gilded frame */}
      <div style={{ position: 'relative', marginTop: 11 }}>
        <div style={{ position: 'absolute', inset: -20, borderRadius: 26, background: 'radial-gradient(circle, rgba(116,219,255,0.55) 0%, transparent 68%)', pointerEvents: 'none' }} />
        <div
          style={{
            position: 'relative', padding: 8, borderRadius: 18,
            background: 'linear-gradient(155deg,#fff0c2 0%,#d8a93e 42%,#9c6c1c 100%)',
            boxShadow: '0 16px 34px rgba(0,0,0,.6), 0 0 22px rgba(116,219,255,0.35), inset 0 1px 0 rgba(255,255,255,.55)',
          }}
        >
          <div style={{ padding: 5, borderRadius: 13, background: 'linear-gradient(155deg,#2a1f0c,#150f06)', boxShadow: 'inset 0 0 10px rgba(0,0,0,.6)' }}>
            <Card card={card} size="md" />
          </div>
        </div>
      </div>
    </div>
  )
}
