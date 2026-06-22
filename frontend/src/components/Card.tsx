const SUIT_SYMBOLS: Record<string, string> = {
  C: '♣',
  D: '♦',
  H: '♥',
  S: '♠',
}

type CardKind = 'normal' | 'wizard' | 'jester'

interface ParsedCard {
  kind: CardKind
  rank: string
  symbol: string
  colorClass: 'red' | 'dark' | ''
  label: string
}

function parseCard(card: string): ParsedCard {
  if (card.startsWith('W')) {
    return { kind: 'wizard', rank: '', symbol: '✦', colorClass: '', label: 'Wizard' }
  }
  if (card.startsWith('N')) {
    return { kind: 'jester', rank: '', symbol: '★', colorClass: '', label: 'Jester' }
  }
  const suit = card[0]
  const rank = card.slice(1)
  const symbol = SUIT_SYMBOLS[suit] ?? suit
  const isRed = suit === 'D' || suit === 'H'
  return {
    kind: 'normal',
    rank,
    symbol,
    colorClass: isRed ? 'red' : 'dark',
    label: `${rank}${symbol}`,
  }
}

// width clamps scale with the viewport (vmax = larger axis, so portrait scales off height); height follows 5:7
const WIDTH: Record<NonNullable<CardProps['size']>, string> = {
  sm: 'clamp(28px, 4vmax, 52px)',
  md: 'clamp(34px, 5.2vmax, 64px)',
  lg: 'clamp(40px, 6vmax, 80px)',
}

interface CardProps {
  card: string
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  faceDown?: boolean
  selected?: boolean
}

export default function Card({
  card,
  onClick,
  disabled,
  size = 'md',
  faceDown,
  selected,
}: CardProps) {
  const width = WIDTH[size]

  if (faceDown) {
    return (
      <div
        className="rounded-lg border border-panel-edge select-none"
        style={{
          width,
          aspectRatio: '5 / 7',
          background: 'repeating-linear-gradient(45deg,#5a4330,#5a4330 6px,#3c2a1b 6px,#3c2a1b 12px)',
        }}
      />
    )
  }

  const { kind, rank, symbol, colorClass, label } = parseCard(card)
  const interactive = !!onClick && !disabled

  const cornerFont = `clamp(9px, 1.4vmax, 16px)`
  const midFont = `clamp(15px, 2.4vmax, 30px)`
  const specialFont = `clamp(18px, 3vmax, 38px)`

  const content =
    kind === 'normal' ? (
      <>
        <div className="corner px-1 pt-0.5" style={{ fontSize: cornerFont }}>
          <div>{rank}</div>
          <div>{symbol}</div>
        </div>
        <div className="mid" style={{ fontSize: midFont }}>
          {symbol}
        </div>
        <div className="corner br px-1 pb-0.5" style={{ fontSize: cornerFont }}>
          <div>{rank}</div>
          <div>{symbol}</div>
        </div>
      </>
    ) : (
      <div className="special-mark" style={{ fontSize: specialFont }}>
        <div className="flex flex-col items-center leading-tight">
          <span>{symbol}</span>
          <span style={{ fontSize: cornerFont, letterSpacing: '0.08em', opacity: 0.95 }}>
            {kind === 'wizard' ? 'WIZ' : 'JST'}
          </span>
        </div>
      </div>
    )

  const className = [
    'ds-card',
    kind === 'normal' ? colorClass : kind,
    interactive ? 'cursor-pointer' : 'cursor-default',
    disabled ? 'opacity-40' : '',
    selected ? 'ring-2 ring-glow-purple' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label}
      className={className}
      style={{ width, aspectRatio: '5 / 7' }}
    >
      {content}
    </button>
  )
}
