const SUIT_SYMBOLS: Record<string, string> = {
  C: '♣',
  D: '♦',
  H: '♥',
  S: '♠',
}

const SUIT_COLORS: Record<string, string> = {
  C: 'text-gray-800',
  D: 'text-red-600',
  H: 'text-red-600',
  S: 'text-gray-800',
}

// W1/N1=C, W2/N2=D, W3/N3=H, W4/N4=S
const SPECIAL_SUIT_MAP: Record<string, string> = {
  '1': 'C', '2': 'D', '3': 'H', '4': 'S',
}

// vmax = larger of vw/vh — cards scale up nicely in portrait without growing huge on desktop
const CARD_W: Record<string, string> = {
  sm: 'clamp(36px, 7vmax, 52px)',
  md: 'clamp(42px, 8vmax, 64px)',
  lg: 'clamp(48px, 10vmax, 76px)',
}
const CARD_H: Record<string, string> = {
  sm: 'clamp(52px, 10.5vmax, 78px)',
  md: 'clamp(62px, 12vmax, 96px)',
  lg: 'clamp(72px, 15vmax, 114px)',
}
const RANK_FS: Record<string, string> = {
  sm: 'clamp(9px, 1.7vmax, 12px)',
  md: 'clamp(10px, 2vmax, 13px)',
  lg: 'clamp(11px, 2.5vmax, 15px)',
}
const SUIT_FS: Record<string, string> = {
  sm: 'clamp(13px, 2.5vmax, 18px)',
  md: 'clamp(15px, 3vmax, 21px)',
  lg: 'clamp(17px, 3.8vmax, 24px)',
}

interface ParsedCard {
  rank: string
  symbol: string
  color: string
  bgClass: string
  borderClass: string
  label: string
}

function parseCard(card: string): ParsedCard {
  if (card.startsWith('W')) {
    const suit = SPECIAL_SUIT_MAP[card[1]] ?? 'C'
    return {
      rank: 'W',
      symbol: SUIT_SYMBOLS[suit] ?? '♣',
      color: SUIT_COLORS[suit] ?? 'text-gray-800',
      bgClass: 'bg-violet-100',
      borderClass: 'border-violet-400',
      label: `Wizard ${SUIT_SYMBOLS[suit] ?? suit}`,
    }
  }
  if (card.startsWith('N')) {
    const suit = SPECIAL_SUIT_MAP[card[1]] ?? 'C'
    return {
      rank: 'N',
      symbol: SUIT_SYMBOLS[suit] ?? '♣',
      color: SUIT_COLORS[suit] ?? 'text-gray-800',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-400',
      label: `Jester ${SUIT_SYMBOLS[suit] ?? suit}`,
    }
  }
  const suit = card[0]
  const rank = card.slice(1)
  return {
    rank,
    symbol: SUIT_SYMBOLS[suit] ?? suit,
    color: SUIT_COLORS[suit] ?? 'text-gray-800',
    bgClass: 'bg-white',
    borderClass: 'border-gray-300',
    label: `${rank}${SUIT_SYMBOLS[suit] ?? suit}`,
  }
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
  if (faceDown) {
    return (
      <div
        className="rounded-lg border-2 border-gray-600 bg-gray-700 flex items-center justify-center select-none"
        style={{ width: CARD_W[size], height: CARD_H[size] }}
      >
        <span className="text-gray-500" style={{ fontSize: SUIT_FS[size] }}>🂠</span>
      </div>
    )
  }

  const { rank, symbol, color, bgClass, borderClass, label } = parseCard(card)
  const interactive = !!onClick && !disabled

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label}
      style={{ width: CARD_W[size], height: CARD_H[size] }}
      className={`
        rounded-lg border-2 font-bold select-none
        ${bgClass} ${borderClass} ${color}
        flex flex-col items-start justify-between p-1
        transition-transform duration-100
        ${interactive ? 'active:scale-95 cursor-pointer touch-manipulation' : 'cursor-default'}
        ${selected ? '-translate-y-3 ring-2 ring-purple-400' : ''}
        ${disabled ? 'opacity-40' : ''}
      `}
    >
      <span style={{ fontSize: RANK_FS[size], lineHeight: 1 }} className="font-bold">{rank}</span>
      <span style={{ fontSize: SUIT_FS[size], lineHeight: 1 }} className="self-center">{symbol}</span>
      <span style={{ fontSize: RANK_FS[size], lineHeight: 1 }} className="self-end rotate-180">{rank}</span>
    </button>
  )
}
