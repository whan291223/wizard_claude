const SUIT_SYMBOLS: Record<string, string> = {
  C: '♣',
  D: '♦',
  H: '♥',
  S: '♠',
}

const SUIT_COLORS: Record<string, string> = {
  C: 'text-white',
  D: 'text-red-400',
  H: 'text-red-400',
  S: 'text-white',
}

function parseCard(card: string): { label: string; color: string; bg: string } {
  if (card.startsWith('W')) {
    return { label: 'WIZ', color: 'text-yellow-300', bg: 'bg-yellow-900 border-yellow-500' }
  }
  if (card.startsWith('N')) {
    return { label: 'JES', color: 'text-gray-400', bg: 'bg-gray-800 border-gray-600' }
  }
  const suit = card[0]
  const rank = card.slice(1)
  const symbol = SUIT_SYMBOLS[suit] ?? suit
  const color = SUIT_COLORS[suit] ?? 'text-white'
  return {
    label: `${rank}${symbol}`,
    color,
    bg: 'bg-gray-100 border-gray-300',
  }
}

interface CardProps {
  card: string
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  faceDown?: boolean
}

export default function Card({ card, onClick, disabled, size = 'md', faceDown }: CardProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs',
    md: 'w-14 h-20 text-sm',
    lg: 'w-16 h-24 text-base',
  }

  if (faceDown) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg border-2 border-gray-600 bg-gray-700 flex items-center justify-center`}>
        <span className="text-gray-500 text-xs">🂠</span>
      </div>
    )
  }

  const { label, color, bg } = parseCard(card)
  const isPlayingCard = !card.startsWith('W') && !card.startsWith('N')

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`
        ${sizeClasses[size]} rounded-lg border-2 font-bold
        ${isPlayingCard ? `${bg} text-gray-900` : `${bg} border-2`}
        ${color}
        ${onClick && !disabled ? 'hover:-translate-y-2 active:scale-95 cursor-pointer' : 'cursor-default'}
        ${disabled ? 'opacity-40' : ''}
        transition-transform duration-100 select-none flex items-center justify-center
      `}
    >
      {label}
    </button>
  )
}
