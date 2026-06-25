import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import WizardCard, { type WizardColor, type WizardVariant } from '../components/WizardCard'

// Ported from the "Wizard Card Redesign" Claude Design project (Wizard Cards.dc.html).
// A showcase of the redesigned deck: the color system, wizards, jesters, card states,
// and a fanned hand. Felt theme / card size / hand spread are adjustable.

type Felt = 'Emerald' | 'Plum' | 'Midnight' | 'Ember'
type CardSize = 'Compact' | 'Comfortable' | 'Grand'
type HandSpread = 'Tight stack' | 'Natural fan' | 'Wide spread'

const COLORS: WizardColor[] = ['dark', 'crimson', 'rose', 'blue']

const META: Record<WizardColor, { name: string; swatch: string }> = {
  dark:    { name: 'Onyx',    swatch: '#dee1ea' },
  crimson: { name: 'Scarlet', swatch: '#f4364a' },
  rose:    { name: 'Fuchsia', swatch: '#ff6ec2' },
  blue:    { name: 'Azure',   swatch: '#5a96ff' },
}

const FELTS: Record<Felt, { color: string; glow: string; deep: string; accent: string; dim: string; soft: string }> = {
  Emerald:  { color: '#0a1f17', glow: '#16402e', deep: '#08160f', accent: '#79c79f', dim: '#7fae93', soft: '#cfe6d8' },
  Plum:     { color: '#150a24', glow: '#3a1d5e', deep: '#0e0718', accent: '#b98be6', dim: '#9d7fc4', soft: '#e7d6f5' },
  Midnight: { color: '#0b0f17', glow: '#1c2740', deep: '#06080d', accent: '#7fa8d6', dim: '#8b9bb5', soft: '#cdd9ec' },
  Ember:    { color: '#1c0a0d', glow: '#4a141d', deep: '#110508', accent: '#e8a07a', dim: '#c98f78', soft: '#f4d9c8' },
}

interface StateSpec {
  label: string
  variant: WizardVariant
  color: WizardColor
  rank?: number
  selected?: boolean
  disabled?: boolean
  faceDown?: boolean
  interactive?: boolean
}

const STATES: StateSpec[] = [
  { label: 'Selected',  variant: 'number', color: 'blue',    rank: 11, selected: true,  interactive: false },
  { label: 'Disabled',  variant: 'number', color: 'crimson', rank: 5,  disabled: true },
  { label: 'Face down', variant: 'number', color: 'dark',    rank: 9,  faceDown: true,  interactive: false },
  { label: 'Default',   variant: 'number', color: 'rose',    rank: 7 },
]

const HAND_SPEC: { color: WizardColor; variant: WizardVariant; rank: number }[] = [
  { color: 'dark',    variant: 'number', rank: 4 },
  { color: 'crimson', variant: 'wizard', rank: 13 },
  { color: 'rose',    variant: 'number', rank: 10 },
  { color: 'blue',    variant: 'number', rank: 13 },
  { color: 'dark',    variant: 'jester', rank: 0 },
]

const FELT_OPTIONS: Felt[] = ['Emerald', 'Plum', 'Midnight', 'Ember']
const SIZE_OPTIONS: CardSize[] = ['Compact', 'Comfortable', 'Grand']
const SPREAD_OPTIONS: HandSpread[] = ['Tight stack', 'Natural fan', 'Wide spread']

const sectionWrap: CSSProperties = { maxWidth: 1120, margin: '0 auto 72px' }
const sectionHead: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }
const h2Style: CSSProperties = { fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 24, margin: 0, color: '#f4f7f3' }

export default function WizardCardsShowcase() {
  const [felt, setFelt] = useState<Felt>('Plum')
  const [cardSize, setCardSize] = useState<CardSize>('Comfortable')
  const [handSpread, setHandSpread] = useState<HandSpread>('Wide spread')

  const colorGroups = COLORS.map((c) => ({
    name: META[c].name,
    swatch: META[c].swatch,
    cards: [2, 8, 13].map((r) => ({ color: c, rank: r })),
  }))

  const t = FELTS[felt] || FELTS.Emerald
  const feltImage = `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.022) 0.7px, transparent 1.4px), repeating-linear-gradient(48deg, rgba(0,0,0,0.16) 0 2px, transparent 2px 7px), repeating-linear-gradient(-42deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 7px), radial-gradient(ellipse at 50% 0%, ${t.glow} 0%, ${t.deep} 70%)`

  const sizeMul = ({ Compact: 0.78, Comfortable: 1, Grand: 1.26 } as Record<CardSize, number>)[cardSize] ?? 1
  const sc = (n: number) => Math.round(n * sizeMul * 100) / 100
  const s = { num: sc(1.1), wiz: sc(1.55), jes: sc(1.55), state: sc(1.45), hand: sc(1.5) }

  const step = ({ 'Tight stack': 2.5, 'Natural fan': 6, 'Wide spread': 11 } as Record<HandSpread, number>)[handSpread] ?? 6

  const hand = HAND_SPEC.map((hc, i) => ({
    ...hc,
    z: i + 1,
    transform: `translateX(-50%) rotate(${(-2 * step + i * step).toFixed(2)}deg)`,
  }))

  const feltAccent = t.accent
  const feltAccentDim = t.dim
  const heroGradient = `linear-gradient(180deg,#ffffff,${t.soft} 55%,${t.accent})`

  const selectStyle: CSSProperties = {
    background: 'rgba(0,0,0,0.35)', color: '#eef0f5', border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 8, padding: '7px 10px', fontFamily: "'Outfit', sans-serif", fontSize: 13, cursor: 'pointer',
  }
  const labelStyle: CSSProperties = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: feltAccentDim, fontWeight: 600 }

  return (
    <div
      data-screen-label="Wizard Cards Showcase"
      style={{
        minHeight: '100vh', padding: '64px 56px 96px', fontFamily: "'Outfit', sans-serif", color: '#eef0f5',
        backgroundColor: t.color, backgroundImage: feltImage,
        backgroundSize: '11px 11px,9px 9px,9px 9px,100% 100%', backgroundAttachment: 'fixed',
      }}
    >
      {/* Controls */}
      <div style={{ maxWidth: 1120, margin: '0 auto 28px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Link to="/" style={{ color: feltAccent, textDecoration: 'none', fontSize: 13, letterSpacing: '0.1em', fontWeight: 600 }}>
          &larr; Back
        </Link>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Felt</span>
            <select style={selectStyle} value={felt} onChange={(e) => setFelt(e.target.value as Felt)}>
              {FELT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Card size</span>
            <select style={selectStyle} value={cardSize} onChange={(e) => setCardSize(e.target.value as CardSize)}>
              {SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle}>Hand spread</span>
            <select style={selectStyle} value={handSpread} onChange={(e) => setHandSpread(e.target.value as HandSpread)}>
              {SPREAD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </div>
      </div>

      <header style={{ maxWidth: 1120, margin: '0 auto 56px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: '0.42em', textTransform: 'uppercase', color: feltAccent, marginBottom: 14, fontWeight: 600 }}>A redesigned deck</div>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 'clamp(40px,6vw,72px)', lineHeight: 1, margin: 0, background: heroGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.5))' }}>WIZARD</h1>
        <p style={{ maxWidth: 560, margin: '18px auto 0', color: '#aebfb6', fontSize: 16, lineHeight: 1.55 }}>
          Color is the identity. Four hues replace the four suits &mdash; rank reads at a glance, gems mark the color group, and the special cards carry their own legend.
        </p>
      </header>

      {/* The Color System */}
      <section style={sectionWrap}>
        <div style={sectionHead}>
          <h2 style={h2Style}>The Color System</h2>
          <span style={{ color: feltAccentDim, fontSize: 14 }}>Ranks 2&ndash;13 &middot; 13 is highest</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 28 }}>
          {colorGroups.map((grp) => (
            <div key={grp.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 13, height: 13, borderRadius: '50%', background: grp.swatch, boxShadow: `0 0 10px ${grp.swatch}` }} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 17, fontWeight: 700, letterSpacing: '0.04em' }}>{grp.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {grp.cards.map((cd) => (
                  <WizardCard key={cd.rank} variant="number" color={cd.color} rank={cd.rank} scale={s.num} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Wizards */}
      <section style={sectionWrap}>
        <div style={sectionHead}>
          <h2 style={h2Style}>Wizards &mdash; the highest power</h2>
          <span style={{ color: feltAccentDim, fontSize: 14 }}>Four guardians, one per color</span>
        </div>
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          {COLORS.map((c) => (
            <WizardCard key={c} variant="wizard" color={c} scale={s.wiz} />
          ))}
        </div>
      </section>

      {/* Jesters */}
      <section style={sectionWrap}>
        <div style={sectionHead}>
          <h2 style={h2Style}>Jesters &mdash; worth nothing</h2>
          <span style={{ color: feltAccentDim, fontSize: 14 }}>Cracked, faded, wobbling</span>
        </div>
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          {COLORS.map((c) => (
            <WizardCard key={c} variant="jester" color={c} scale={s.jes} />
          ))}
        </div>
      </section>

      {/* States */}
      <section style={sectionWrap}>
        <div style={sectionHead}>
          <h2 style={h2Style}>States</h2>
          <span style={{ color: feltAccentDim, fontSize: 14 }}>Hover any card above &middot; click to select</span>
        </div>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end' }}>
          {STATES.map((st) => (
            <div key={st.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <WizardCard
                variant={st.variant}
                color={st.color}
                rank={st.rank}
                scale={s.state}
                selected={st.selected}
                disabled={st.disabled}
                faceDown={st.faceDown}
                interactive={st.interactive}
              />
              <span style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: feltAccentDim, fontWeight: 600 }}>{st.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Your Hand */}
      <section style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ ...sectionHead, marginBottom: 8 }}>
          <h2 style={h2Style}>Your Hand</h2>
          <span style={{ color: feltAccentDim, fontSize: 14 }}>Click a card to play it</span>
        </div>
        <div style={{ position: 'relative', height: 360, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 520, height: 300 }}>
            {hand.map((hc, i) => (
              <div key={i} style={{ position: 'absolute', left: '50%', bottom: 0, transformOrigin: '50% 360px', transform: hc.transform, zIndex: hc.z }}>
                <WizardCard variant={hc.variant} color={hc.color} rank={hc.rank} scale={s.hand} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
