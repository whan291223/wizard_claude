import type { CSSProperties } from 'react'
import WizardCard, { type WizardColor } from '../WizardCard'
import { COLOR_DOT } from '../../utils/cards'

interface OpponentSeatProps {
  name: string
  color: WizardColor
  bid: number | null
  won: number
  fanCount: number
  emote?: string
  active?: boolean
  side?: boolean // left/right seat — tighter fan
}

// Arc of face-down cards curving down toward the table (downFan from Game Table.dc.html).
function downFan(n: number, step: number, gapX: number, dip: number) {
  const out: { transform: string; z: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = i - (n - 1) / 2
    const angle = (-t * step).toFixed(1)
    const x = (t * gapX).toFixed(1)
    const y = (-Math.abs(t) * dip).toFixed(1)
    out.push({ transform: `translateX(calc(-50% + ${x}px)) translateY(${y}px) rotate(${angle}deg)`, z: i + 1 })
  }
  return out
}

export default function OpponentSeat({ name, color, bid, won, fanCount, emote, active, side }: OpponentSeatProps) {
  const fan = downFan(fanCount, side ? 7 : 8, side ? 19 : 21, side ? 6 : 7)
  const dot = COLOR_DOT[color]

  const badgeStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 999,
    background: active ? 'rgba(95,227,154,0.16)' : 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(6px)',
    border: active ? '1px solid rgba(125,255,176,0.55)' : '1px solid rgba(255,255,255,0.1)',
    transition: 'background .2s, border-color .2s',
  }

  return (
    <div style={{ position: 'relative' }}>
      {emote && (
        <div style={{ position: 'absolute', left: '50%', top: -2, transform: 'translateX(-50%)', zIndex: 30, animation: 'gtEmote 3.6s ease-in-out forwards' }}>
          <div style={{ position: 'relative', background: 'rgba(255,255,255,0.96)', color: '#16261d', fontSize: 20, fontWeight: 700, lineHeight: 1.3, padding: '9px 16px 11px', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,.4)', whiteSpace: 'normal', maxWidth: 240, textAlign: 'center', wordBreak: 'break-word' }}>
            {emote}
            <span style={{ position: 'absolute', left: '50%', bottom: -7, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '9px solid rgba(255,255,255,0.96)' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: emote ? 44 : 0 }}>
        <div style={badgeStyle}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 7px ${dot}` }} />
          <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 14, color: '#eaf3ec' }}>{name}</span>
        </div>
        <div style={{ marginTop: 5, fontSize: 11, color: '#a9c0b2', letterSpacing: '0.04em' }}>
          <span style={{ color: '#7dffb0', fontWeight: 600 }}>Bid {bid ?? '–'}</span> · Won {won}
        </div>
      </div>

      <div style={{ position: 'relative', height: 90, marginTop: 10 }}>
        {fan.map((c, i) => (
          <div key={i} style={{ position: 'absolute', left: '50%', top: 0, transform: c.transform, transformOrigin: '50% 0%', zIndex: c.z }}>
            <WizardCard variant="number" color={color} rank="7" scale={0.6} faceDown interactive={false} />
          </div>
        ))}
      </div>
    </div>
  )
}
