import { createElement as h, useState, type CSSProperties, type ReactNode } from 'react'

// Ported from the "Wizard Card Redesign" Claude Design project (WizardCard.dc.html).
// Color is the identity: four hues replace the four suits. Ranks 2-13 (13 highest),
// plus the two special cards — wizard (highest power) and jester (worth nothing).

export type WizardColor = 'dark' | 'crimson' | 'rose' | 'blue'
export type WizardVariant = 'number' | 'wizard' | 'jester'

interface Pal {
  label: string
  bg1: string
  bg2: string
  accent: string
  accent2: string
  glow: string
  mute1: string
  mute2: string
  maccent: string
  hair: string
  hair2: string
  eye: string
  skin: string
  outfit: string
}

const PAL: Record<WizardColor, Pal> = {
  dark:    {label:'Onyx',    bg1:'#34353f', bg2:'#0a0a0e', accent:'#dee1ea', accent2:'#9296a4', glow:'rgba(208,214,232,', mute1:'#4a4a54', mute2:'#1d1d24', maccent:'#bcbec8', hair:'#e6e9f4', hair2:'#a7accf', eye:'#b79bf2', skin:'#f4e8e2', outfit:'#1b1b27'},
  crimson: {label:'Scarlet', bg1:'#dc1830', bg2:'#4c0710', accent:'#ffd66b', accent2:'#d39b2e', glow:'rgba(248,76,86,',  mute1:'#ac3340', mute2:'#3c1419', maccent:'#e0a878', hair:'#f43a4e', hair2:'#aa1526', eye:'#ffd56b', skin:'#fce6dd', outfit:'#6a101c'},
  rose:    {label:'Fuchsia', bg1:'#fb52a8', bg2:'#7d1450', accent:'#fff2f9', accent2:'#ff8fc8', glow:'rgba(255,108,190,',mute1:'#c85e98', mute2:'#56243f', maccent:'#ffc2e0', hair:'#ff8ecb', hair2:'#e0529a', eye:'#ff5fa8', skin:'#fdeae3', outfit:'#a82069'},
  blue:    {label:'Azure',   bg1:'#3461f4', bg2:'#0f2270', accent:'#8ae3ff', accent2:'#4596e4', glow:'rgba(96,158,255,', mute1:'#4a62a0', mute2:'#1d2a4a', maccent:'#9cc4f0', hair:'#7ad6ff', hair2:'#2f7fd6', eye:'#5fe0ff', skin:'#f1ece7', outfit:'#12296e'},
}

const KEYFRAMES = `
@keyframes wcPulse{0%,100%{transform:scale(1);opacity:.95}50%{transform:scale(1.07);opacity:.4}}
@keyframes wcWobble{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
@keyframes wcTwinkle{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1.1)}}
@keyframes wcAura{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
@keyframes wcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
`

// Inject the card keyframes once so the component is self-contained wherever it renders.
function ensureKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById('wizard-card-keyframes')) return
  const st = document.createElement('style')
  st.id = 'wizard-card-keyframes'
  st.textContent = KEYFRAMES
  document.head.appendChild(st)
}
ensureKeyframes()

function gemSVG(p: Pal, id: string, size: number): string {
  return `<svg width="${size}" height="${size * 1.18}" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;filter:drop-shadow(0 1px 3px ${p.glow}0.55))">
    <defs>
      <linearGradient id="gm${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="0.42" stop-color="${p.accent}"/>
        <stop offset="1" stop-color="${p.accent2}"/>
      </linearGradient>
    </defs>
    <g stroke="${p.accent2}" stroke-width="0.7" stroke-linejoin="round">
      <polygon points="12,2 22,10 12,27 2,10" fill="url(#gm${id})"/>
      <polygon points="12,2 2,10 22,10" fill="#ffffff" opacity="0.28"/>
      <polygon points="2,10 12,10 12,27" fill="#000000" opacity="0.14"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="12" y1="2" x2="12" y2="10"/>
      <line x1="2" y1="10" x2="12" y2="27"/>
      <line x1="22" y1="10" x2="12" y2="27"/>
    </g>
  </svg>`
}

function starPts(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const a1 = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const a2 = a1 + Math.PI / 5
    pts.push((cx + Math.cos(a1) * r).toFixed(1) + ',' + (cy + Math.sin(a1) * r).toFixed(1))
    pts.push((cx + Math.cos(a2) * r * 0.45).toFixed(1) + ',' + (cy + Math.sin(a2) * r * 0.45).toFixed(1))
  }
  return pts.join(' ')
}
function star(cx: number, cy: number, r: number, fill: string): string {
  return `<polygon points="${starPts(cx, cy, r)}" fill="${fill}" stroke="#fff8d8" stroke-width="0.6"/>`
}
function flower(petal: string, center: string): string {
  let s = ''
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5
    s += `<ellipse cx="${(Math.cos(a) * 7).toFixed(1)}" cy="${(Math.sin(a) * 7).toFixed(1)}" rx="5.5" ry="3.6" fill="${petal}" transform="rotate(${(i * 72).toFixed(0)})"/>`
  }
  return `<g>${s}<circle cx="0" cy="0" r="3.8" fill="${center}"/></g>`
}

function eyeSVG(cx: number, cy: number, iris: string): string {
  return `<g>
    <path d="M${cx - 11},${cy - 7} Q${cx},${cy - 15} ${cx + 11},${cy - 7}" stroke="#3a2b3d" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${cy}" rx="8.6" ry="11.5" fill="#ffffff"/>
    <ellipse cx="${cx}" cy="${cy + 1}" rx="7.6" ry="10.6" fill="${iris}"/>
    <ellipse cx="${cx}" cy="${cy - 3}" rx="7.6" ry="5" fill="#000" opacity="0.12"/>
    <circle cx="${cx}" cy="${cy + 3.5}" r="4.2" fill="#241a30"/>
    <circle cx="${cx - 3}" cy="${cy - 3.5}" r="3.2" fill="#fff"/>
    <circle cx="${cx + 3.2}" cy="${cy + 6}" r="1.6" fill="#fff" opacity="0.85"/>
  </g>`
}

function animeGirl(key: WizardColor, p: Pal): string {
  const sk = p.skin, hair = p.hair, h2 = p.hair2, ac = p.accent
  const backHair = `<path d="M25,82 C18,32 38,12 60,12 C82,12 102,32 95,82 L93,142 L74,130 L60,143 L46,130 L27,142 Z" fill="${h2}"/>`
  const neck = `<path d="M48,98 L48,116 L72,116 L72,98 Z" fill="${sk}"/>`
  const face = `
    <ellipse cx="60" cy="74" rx="32" ry="34" fill="${sk}"/>
    <circle cx="30" cy="76" r="6" fill="${sk}"/><circle cx="90" cy="76" r="6" fill="${sk}"/>
    <ellipse cx="42" cy="86" rx="7" ry="4.2" fill="${p.eye}" opacity="0.28"/>
    <ellipse cx="78" cy="86" rx="7" ry="4.2" fill="${p.eye}" opacity="0.28"/>
    ${eyeSVG(47, 79, p.eye)} ${eyeSVG(73, 79, p.eye)}
    <path d="M40,64 Q47,61 54,64" stroke="${h2}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M66,64 Q73,61 80,64" stroke="${h2}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M55,93 Q60,97 65,93" stroke="#c2506a" stroke-width="2" fill="none" stroke-linecap="round"/>`
  const collar = `<path d="M40,114 Q60,128 80,114 L84,150 L36,150 Z" fill="${p.outfit}"/>`
  let frontHair = `<path d="M28,60 C28,28 44,15 60,15 C76,15 92,28 92,60 C85,45 79,53 71,47 C67,60 63,47 60,52 C57,47 53,60 49,47 C41,53 35,45 28,60 Z" fill="${hair}"/>`
  let acc = ''
  if (key === 'dark') {
    acc = `<g><path d="M60,-26 L86,22 L34,22 Z" fill="${p.outfit}" stroke="${h2}" stroke-width="1.4"/>
      <ellipse cx="60" cy="23" rx="42" ry="8.5" fill="${p.outfit}" stroke="${h2}" stroke-width="1.4"/>
      <path d="M42,16 L78,16 L76,22 L44,22 Z" fill="${ac}" opacity="0.9"/>
      ${star(60, 2, 7, ac)}</g>`
  } else if (key === 'crimson') {
    frontHair = `<path d="M28,60 C28,28 44,15 60,15 C76,15 92,28 92,60 C84,46 76,52 70,46 C66,58 62,47 60,52 C58,47 54,58 50,46 C44,52 36,46 28,60 Z" fill="${hair}"/>
      <path d="M24,52 C12,70 14,108 26,128 L40,120 C30,100 32,72 38,58 Z" fill="${hair}"/>
      <path d="M96,52 C108,70 106,108 94,128 L80,120 C90,100 88,72 82,58 Z" fill="${hair}"/>`
    acc = `<g>${star(38, 28, 7, ac)}${star(82, 28, 7, ac)}</g>`
  } else if (key === 'rose') {
    frontHair = `<path d="M26,62 C24,30 44,15 60,15 C76,15 96,30 94,62 C92,48 84,40 78,52 C74,40 66,50 60,46 C54,50 46,40 42,52 C36,40 28,48 26,62 Z" fill="${hair}"/>`
    acc = `<g transform="translate(35,30) scale(1.05)">${flower(ac, '#fff4fa')}</g>`
  } else if (key === 'blue') {
    frontHair = `<path d="M28,58 C28,28 44,16 60,16 C76,16 92,28 92,58 C86,46 80,52 72,46 C68,56 64,48 60,51 C56,48 52,56 48,46 C40,52 34,46 28,58 Z" fill="${hair}"/>`
    acc = `<g>${star(83, 30, 7.5, ac)}<circle cx="60" cy="16" r="2" fill="#fff"/></g>`
  }
  return `<svg viewBox="0 -30 120 182" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5))">
    ${backHair}${collar}${neck}${face}${frontHair}${acc}</svg>`
}

function jesterSVG(key: WizardColor, p: Pal): string {
  const sk = p.skin, c1 = p.maccent, c2 = p.mute1, ac = p.accent2, ec = p.eye
  const eL = 50, eR = 70, eY = 74
  const ruffle = `<path d="M30,46 Q60,38 90,46 L86,57 Q60,51 34,57 Z" fill="${ac}"/>`
  const face = `<circle cx="60" cy="76" r="26" fill="${sk}"/>`
  const blush = `<ellipse cx="45" cy="85" rx="5" ry="3" fill="${ec}" opacity="0.32"/><ellipse cx="75" cy="85" rx="5" ry="3" fill="${ec}" opacity="0.32"/>`
  const body = `<path d="M38,100 Q60,110 82,100 L88,140 Q60,150 32,140 Z" fill="${c2}"/><path d="M36,102 Q60,112 84,102" stroke="${c1}" stroke-width="3" fill="none"/><circle cx="60" cy="126" r="4" fill="${ac}"/>`
  let hat: string, eyes: string, mouth: string, extra = ''

  if (key === 'dark') {            // sleepy / aloof
    hat = `<path d="M32,48 C24,20 18,10 10,6 C16,20 18,30 26,46 Z" fill="${c1}"/><circle cx="11" cy="6" r="5" fill="${ac}"/>
      <path d="M88,48 C96,20 102,10 110,6 C104,20 102,30 94,46 Z" fill="${c2}"/><circle cx="109" cy="6" r="5" fill="${ac}"/>
      <path d="M48,40 C50,14 58,4 60,2 C62,4 70,14 72,40 Z" fill="${c1}"/><circle cx="60" cy="2" r="5" fill="${ac}"/>`
    eyes = `<path d="M${eL - 6},${eY} Q${eL},${eY + 5} ${eL + 6},${eY}" stroke="#4f4148" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M${eR - 6},${eY} Q${eR},${eY + 5} ${eR + 6},${eY}" stroke="#4f4148" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
    mouth = `<path d="M55,92 Q60,89 65,92" stroke="#7a5a63" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    extra = `<text x="82" y="56" font-family="Cinzel,serif" font-size="12" fill="${c1}">z</text><text x="89" y="47" font-family="Cinzel,serif" font-size="8" fill="${c1}" opacity="0.7">z</text>`
  } else if (key === 'crimson') {  // angry / hot-headed
    hat = `<path d="M34,46 L18,2 L42,40 Z" fill="${c1}"/><circle cx="18" cy="2" r="4.5" fill="${ac}"/>
      <path d="M86,46 L102,2 L78,40 Z" fill="${c2}"/><circle cx="102" cy="2" r="4.5" fill="${ac}"/>
      <path d="M50,40 L60,-6 L70,40 Z" fill="${c1}"/><circle cx="60" cy="-6" r="4.5" fill="${ac}"/>`
    eyes = `<path d="M${eL - 7},${eY - 5} L${eL + 5},${eY - 1}" stroke="#5a2f33" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M${eR + 7},${eY - 5} L${eR - 5},${eY - 1}" stroke="#5a2f33" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="${eL}" cy="${eY + 2}" r="3" fill="#3a2226"/><circle cx="${eR}" cy="${eY + 2}" r="3" fill="#3a2226"/>`
    mouth = `<path d="M52,90 L56,94 L60,90 L64,94 L68,90" stroke="#7a3a40" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`
    extra = `<g stroke="#e6324a" stroke-width="1.8" stroke-linecap="round"><path d="M76,55 l5,0 M78.5,52.5 l0,5"/><path d="M83,61 l4,1 M85.5,58.5 l-1,5"/></g>`
  } else if (key === 'rose') {     // winking / cheeky
    hat = `<path d="M32,46 C26,24 30,8 16,6 C22,16 20,32 28,46 Z" fill="${c1}"/><circle cx="15" cy="5" r="6" fill="${ac}"/>
      <path d="M88,46 C94,24 90,8 104,6 C98,16 100,32 92,46 Z" fill="${c2}"/><circle cx="105" cy="5" r="6" fill="${ac}"/>
      <path d="M50,40 C52,18 54,6 60,4 C66,6 68,18 70,40 Z" fill="${c1}"/><circle cx="60" cy="3" r="6" fill="${ac}"/>`
    eyes = `<path d="M${eL - 6},${eY + 1} Q${eL},${eY - 5} ${eL + 6},${eY + 1}" stroke="#7a4a58" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <circle cx="${eR}" cy="${eY}" r="4.4" fill="#3a2630"/><circle cx="${eR - 1.4}" cy="${eY - 1.6}" r="1.6" fill="#fff"/>`
    mouth = `<path d="M51,87 Q60,100 69,87 Z" fill="#9c3a55"/><path d="M55,90 Q60,96 65,90 Z" fill="#ff9bb6"/>`
    extra = `<path d="M80,53 c-2.2,-3 -7.2,-1 -5,3 c1,2 5,5 5,5 c0,0 4,-3 5,-5 c2.2,-4 -2.8,-6 -5,-3 Z" fill="${ac}"/>`
  } else {                     // blue: sad / crying
    hat = `<path d="M32,48 C18,36 8,32 4,40 C14,42 20,48 28,53 Z" fill="${c1}"/><circle cx="4" cy="40" r="5" fill="${ac}"/>
      <path d="M88,48 C102,36 112,32 116,40 C106,42 100,48 92,53 Z" fill="${c2}"/><circle cx="116" cy="40" r="5" fill="${ac}"/>
      <path d="M48,42 C46,22 54,10 60,8 C66,10 74,22 72,42 Z" fill="${c1}"/><circle cx="60" cy="7" r="5" fill="${ac}"/>`
    eyes = `<path d="M${eL - 6},${eY - 3} Q${eL},${eY - 6} ${eL + 6},${eY - 2}" stroke="#3a4a66" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="${eL}" cy="${eY + 1}" r="3" fill="#26303f"/>
      <path d="M${eR - 6},${eY - 2} Q${eR},${eY - 6} ${eR + 6},${eY - 3}" stroke="#3a4a66" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="${eR}" cy="${eY + 1}" r="3" fill="#26303f"/>`
    mouth = `<path d="M53,90 Q60,95 67,90" stroke="#5a6a82" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    extra = `<path d="M${eL},${eY + 5} q-3.5,6 0,8.5 q3.5,-2.5 0,-8.5 Z" fill="${ec}" opacity="0.9"/>`
  }
  return `<svg viewBox="0 -12 120 164" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 3px 7px rgba(0,0,0,0.45))">
    ${hat}${ruffle}${face}${blush}${eyes}${mouth}${extra}${body}</svg>`
}

export interface WizardCardProps {
  variant?: WizardVariant
  color?: WizardColor
  rank?: number | string
  scale?: number
  faceDown?: boolean
  /** Controlled selection. Leave undefined to let the card manage its own selected state on click. */
  selected?: boolean
  disabled?: boolean
  interactive?: boolean
  onClick?: () => void
}

type Corner = 'tl' | 'tr' | 'bl' | 'br'

export default function WizardCard({
  variant = 'number',
  color = 'crimson',
  rank = 13,
  scale = 1,
  faceDown = false,
  selected,
  disabled = false,
  interactive = true,
  onClick,
}: WizardCardProps) {
  const [hover, setHover] = useState(false)
  const [internalSel, setInternalSel] = useState(false)
  const [uid] = useState(() => 'u' + Math.random().toString(36).slice(2, 7))

  const p = PAL[color] || PAL.crimson
  const s = Number(scale) || 1
  const controlled = selected !== undefined
  const interactiveOn = interactive !== false
  const isDisabled = disabled === true
  const isFaceDown = faceDown === true
  const resolvedSel = controlled ? !!selected : internalSel

  const hoverOn = hover && !isDisabled
  const selOn = resolvedSel && !isDisabled

  function cornerWrap(node: ReactNode, corner: Corner): ReactNode {
    const base: CSSProperties = { position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 * s, zIndex: 4 }
    const pos: CSSProperties =
      corner === 'tl' ? { top: 6 * s, left: 7 * s }
      : corner === 'tr' ? { top: 6 * s, right: 7 * s }
      : corner === 'br' ? { bottom: 6 * s, right: 7 * s, transform: 'rotate(180deg)' }
      : { bottom: 6 * s, left: 7 * s, transform: 'rotate(180deg)' }
    return h('div', { key: corner, style: { ...base, ...pos } }, node)
  }

  function rankLabel(text: string): ReactNode {
    if (variant === 'wizard') {
      return h('span', { style: { fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 16 * s, lineHeight: 1,
        background: 'linear-gradient(180deg,#fff6cf,#f6d469 42%,#c9952f 72%,#8a5e16)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.5))' } as CSSProperties }, text)
    }
    const col = variant === 'jester' ? p.maccent : p.accent
    return h('span', { style: { fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: (variant === 'jester' ? 15 : 14) * s, lineHeight: 1,
      color: col, textShadow: `0 1px 3px ${p.glow}0.55)`, opacity: variant === 'jester' ? 0.85 : 1 } }, text)
  }

  function gemNode(corner: Corner): ReactNode {
    return h('div', { style: { lineHeight: 0, opacity: variant === 'jester' ? 0.92 : 1 }, dangerouslySetInnerHTML: { __html: gemSVG(p, uid + corner, 15 * s) } })
  }

  function renderFace(): ReactNode {
    const w = 80 * s, hgt = 120 * s, r = 12 * s
    const rankText = variant === 'wizard' ? 'W' : variant === 'jester' ? 'N' : String(rank ?? 13)

    const glowOn = hoverOn || selOn
    const boxShadow = `0 ${(selOn ? 16 : hoverOn ? 12 : 8) * s}px ${(selOn ? 32 : hoverOn ? 27 : 18) * s}px rgba(0,0,0,0.55)`
      + (glowOn ? `, 0 0 ${(selOn ? 30 : 22) * s}px ${p.glow}${selOn ? 0.75 : 0.55})` : '')
      + `, inset 0 0 ${11 * s}px ${p.glow}0.32)`

    // FACE DOWN
    if (isFaceDown) {
      const rune = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><g fill='none' stroke='${p.accent2}' stroke-width='1.1' opacity='0.5'><circle cx='20' cy='20' r='8'/><path d='M20 8 L20 32 M8 20 L32 20'/><polygon points='20,12 28,20 20,28 12,20'/></g></svg>`)
      const faceStyle: CSSProperties = { position: 'relative', width: w, height: hgt, borderRadius: r, overflow: 'hidden',
        background: `radial-gradient(circle at 50% 42%, ${p.bg1} 0%, #05050a 92%)`,
        boxShadow, border: `${1.5 * s}px solid ${p.accent2}66` }
      return h('div', { style: faceStyle },
        h('div', { key: 'rune', style: { position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,${rune}")`, backgroundSize: `${26 * s}px ${26 * s}px`, opacity: 0.45 } }),
        h('div', { key: 'in', style: { position: 'absolute', inset: 5 * s, borderRadius: r - 4, border: `${1 * s}px solid ${p.accent2}55` } }),
        h('div', { key: 'ctr', style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          h('div', { style: { width: 46 * s, height: 46 * s, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `radial-gradient(circle,${p.bg1},${p.bg2})`, border: `${1.5 * s}px solid ${p.accent2}`, boxShadow: `0 0 ${14 * s}px ${p.glow}0.5)` },
            dangerouslySetInnerHTML: { __html: gemSVG(p, uid + 'back', 22 * s) } }))
      )
    }

    // BACKGROUND per variant
    let bg: string
    let faceExtra: CSSProperties = {}
    if (variant === 'wizard') {
      bg = `radial-gradient(circle at 50% 30%, ${p.glow}0.5) 0%, transparent 56%), radial-gradient(circle at 80% 85%, ${p.glow}0.25) 0%, transparent 45%), linear-gradient(162deg, ${p.bg1} 0%, ${p.bg2} 80%)`
    } else if (variant === 'jester') {
      bg = `linear-gradient(160deg, ${p.mute1} 0%, ${p.mute2} 100%)`
      faceExtra = { border: `${2 * s}px dashed ${p.maccent}`, borderRadius: `${14 * s}px ${9 * s}px ${15 * s}px ${10 * s}px`, animation: 'wcWobble 4.5s ease-in-out infinite' }
    } else {
      bg = `linear-gradient(157deg, ${p.bg1} 0%, ${p.bg2} 100%)`
    }

    const faceStyle: CSSProperties = { position: 'relative', width: w, height: hgt, borderRadius: r, overflow: 'hidden',
      background: bg, boxShadow, border: `${1 * s}px solid ${p.accent2}55`,
      ...(isDisabled ? { filter: 'grayscale(0.85) brightness(0.85)', opacity: 0.4 } : {}), ...faceExtra }

    const kids: ReactNode[] = []

    // texture / starfield
    if (variant === 'wizard') {
      const sf = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><g fill='#fff'><circle cx='8' cy='12' r='0.9'/><circle cx='40' cy='6' r='0.7'/><circle cx='52' cy='34' r='1'/><circle cx='22' cy='44' r='0.8'/><circle cx='14' cy='32' r='0.6'/><circle cx='46' cy='52' r='0.7'/></g></svg>`)
      kids.push(h('div', { key: 'sf', style: { position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,${sf}")`, backgroundSize: `${50 * s}px ${50 * s}px`, opacity: 0.5, pointerEvents: 'none' } }))
    } else {
      kids.push(h('div', { key: 'tx', style: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 0.6px, transparent 1px)', backgroundSize: `${7 * s}px ${7 * s}px`, opacity: 0.6, pointerEvents: 'none' } }))
    }

    // inner glow border
    kids.push(h('div', { key: 'ib', style: { position: 'absolute', inset: 4 * s, borderRadius: Math.max(0, r - 4), border: `${1 * s}px solid ${p.accent}40`, boxShadow: `inset 0 0 ${10 * s}px ${p.glow}0.25)`, pointerEvents: 'none', zIndex: 3 } }))

    // ornate double frame for wizard
    if (variant === 'wizard') {
      kids.push(h('div', { key: 'of1', style: { position: 'absolute', inset: 3 * s, borderRadius: Math.max(0, r - 3), border: `${1.5 * s}px solid`, borderImage: 'linear-gradient(150deg,#f6d469,#8a5e16,#f6d469) 1', pointerEvents: 'none', zIndex: 3 } }))
      kids.push(h('div', { key: 'of2', style: { position: 'absolute', inset: 7 * s, borderRadius: Math.max(0, r - 6), border: `${0.8 * s}px solid #f6d46966`, pointerEvents: 'none', zIndex: 3 } }))
      ;([['tl', { top: 5 * s, left: 5 * s }], ['tr', { top: 5 * s, right: 5 * s }], ['bl', { bottom: 5 * s, left: 5 * s }], ['br', { bottom: 5 * s, right: 5 * s }]] as [string, CSSProperties][]).forEach(([k, po]) =>
        kids.push(h('div', { key: 'cn' + k, style: { position: 'absolute', width: 7 * s, height: 7 * s, borderRadius: '50%', background: 'radial-gradient(circle,#fff6cf,#c9952f)', boxShadow: `0 0 ${5 * s}px #f6d469`, zIndex: 4, ...po } })))
    }

    // CENTER content
    if (variant === 'number') {
      kids.push(h('div', { key: 'ctr', style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 } },
        h('span', { style: { fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 56 * s, lineHeight: 1,
          background: `linear-gradient(180deg,#ffffff 0%, ${p.accent} 46%, ${p.accent2} 100%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          filter: `drop-shadow(0 2px 7px ${p.glow}0.6))` } as CSSProperties }, rankText)))
    } else if (variant === 'wizard') {
      kids.push(h('div', { key: 'aura', style: { position: 'absolute', inset: -3 * s, borderRadius: r + 3, boxShadow: `0 0 ${20 * s}px ${p.glow}0.7), inset 0 0 ${14 * s}px ${p.glow}0.5)`, animation: 'wcAura 2.8s ease-in-out infinite', pointerEvents: 'none', zIndex: 1 } }))
      kids.push(h('div', { key: 'girl', style: { position: 'absolute', left: '8%', right: '8%', bottom: '-2%', top: '14%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2, animation: 'wcFloat 4s ease-in-out infinite' },
        dangerouslySetInnerHTML: { __html: animeGirl(color, p) } }))
      // sparkles
      ;([[18, '24%', 'wcTwinkle 2.2s'], [10, '70%', 'wcTwinkle 1.7s 0.6s'], [8, '40%', 'wcTwinkle 2.6s 1s']] as [number, string, string][]).forEach((sp, i) => {
        kids.push(h('div', { key: 'sp' + i, style: { position: 'absolute', top: sp[1], left: (i === 0 ? '16%' : i === 1 ? '78%' : '30%'), width: (sp[0] * s) / 2, height: (sp[0] * s) / 2, zIndex: 5, animation: sp[2] + ' ease-in-out infinite' },
          dangerouslySetInnerHTML: { __html: `<svg viewBox='0 0 20 20' style='width:100%;height:100%'><polygon points='10,0 12,8 20,10 12,12 10,20 8,12 0,10 8,8' fill='#fff' opacity='0.92'/></svg>` } }))
      })
    } else { // jester
      kids.push(h('div', { key: 'x', style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, opacity: 0.13, pointerEvents: 'none' } },
        h('div', { style: { fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 96 * s, color: '#000' } }, '✕')))
      // cracks
      kids.push(h('div', { key: 'crk', style: { position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' },
        dangerouslySetInnerHTML: { __html: `<svg viewBox='0 0 80 120' preserveAspectRatio='none' style='width:100%;height:100%'>
          <polyline points='0,28 16,40 10,58 26,70' fill='none' stroke='rgba(0,0,0,0.4)' stroke-width='1.1'/>
          <polyline points='80,82 64,72 70,54 58,44' fill='none' stroke='rgba(0,0,0,0.34)' stroke-width='1'/>
          <polyline points='52,120 50,104 60,96' fill='none' stroke='rgba(255,255,255,0.22)' stroke-width='1'/></svg>` } }))
      kids.push(h('div', { key: 'jst', style: { position: 'absolute', left: '16%', right: '16%', top: '18%', bottom: '14%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
        dangerouslySetInnerHTML: { __html: jesterSVG(color, p) } }))
    }

    // corners: rank tl, gem tr, rank br, gem bl
    kids.push(cornerWrap(rankLabel(rankText), 'tl'))
    kids.push(cornerWrap(gemNode('tr'), 'tr'))
    kids.push(cornerWrap(rankLabel(rankText), 'br'))
    kids.push(cornerWrap(gemNode('bl'), 'bl'))

    return h('div', { style: faceStyle }, kids)
  }

  const ring = selOn
    ? h('div', { style: { position: 'absolute', inset: -6 * s, borderRadius: 18 * s, border: `${2.5 * s}px solid ${p.accent}`, boxShadow: `0 0 ${18 * s}px ${p.glow}0.85)`, animation: 'wcPulse 1.4s ease-in-out infinite', pointerEvents: 'none', zIndex: 6 } })
    : null

  const inner = h('div', { style: { position: 'relative', display: 'inline-block' } }, ring, renderFace())

  const blocked = isDisabled || !interactiveOn

  return h('div', {
    style: {
      display: 'inline-block',
      position: 'relative',
      transition: 'transform .28s cubic-bezier(.2,.8,.25,1)',
      transform: `translateY(${(selOn ? -22 : hoverOn ? -14 : 0) * s}px)`,
      cursor: blocked ? 'default' : 'pointer',
      WebkitTapHighlightColor: 'transparent',
    } as CSSProperties,
    onMouseEnter: () => { if (!blocked) setHover(true) },
    onMouseLeave: () => setHover(false),
    onClick: () => {
      if (blocked) return
      if (!controlled) setInternalSel((v) => !v)
      onClick?.()
    },
  }, inner)
}
