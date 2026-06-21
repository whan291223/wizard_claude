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

interface ParsedCard {
  rank: string
  suit: string
  symbol: string
  color: string
  bgClass: string
  borderClass: string
  isSpecial: boolean
  label: string
}

function parseCard(card: string): ParsedCard {
  if (card.startsWith('W')) {
    return {
      rank: 'W', suit: '', symbol: '✦', color: 'text-yellow-300',
      bgClass: 'bg-yellow-950', borderClass: 'border-yellow-500',
      isSpecial: true, label: 'WIZARD',
    }
  }
  if (card.startsWith('N')) {
    return {
      rank: 'N', suit: '', symbol: '★', color: 'text-gray-400',
      bgClass: 'bg-gray-800', borderClass: 'border-gray-500',
      isSpecial: true, label: 'JESTER',
    }
  }
  const suit = card[0]
  const rank = card.slice(1)
  return {
    rank,
    suit,
    symbol: SUIT_SYMBOLS[suit] ?? suit,
    color: SUIT_COLORS[suit] ?? 'text-gray-800',
    bgClass: 'bg-white',
    borderClass: 'border-gray-300',
    isSpecial: false,
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
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs',
    md: 'w-12 h-17 text-sm',
    lg: 'w-14 h-20 text-base',
  }
  const rankSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }
  const suitSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  if (faceDown) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 border-gray-600 bg-gray-700 flex items-center justify-center select-none`}
      >
        <span className="text-gray-500">🂠</span>
      </div>
    )
  }

  const { rank, symbol, color, bgClass, borderClass, isSpecial, label } = parseCard(card)
  const interactive = !!onClick && !disabled

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label}
      className={`
        ${sizeClasses[size]} rounded-lg border-2 font-bold select-none
        ${bgClass} ${borderClass}
        ${color}
        flex flex-col items-start justify-between p-1
        transition-transform duration-100
        ${interactive ? 'active:scale-95 cursor-pointer touch-manipulation' : 'cursor-default'}
        ${selected ? '-translate-y-3 ring-2 ring-purple-400' : ''}
        ${disabled ? 'opacity-40' : ''}
      `}
    >
      {isSpecial ? (
        <div className="w-full h-full flex items-center justify-center">
          <span className={`${suitSize[size]} leading-none`}>{symbol}</span>
        </div>
      ) : (
        <>
          <span className={`${rankSize[size]} leading-none font-bold`}>{rank}</span>
          <span className={`${suitSize[size]} leading-none self-center`}>{symbol}</span>
          <span className={`${rankSize[size]} leading-none self-end rotate-180`}>{rank}</span>
        </>
      )}
    </button>
  )
}
