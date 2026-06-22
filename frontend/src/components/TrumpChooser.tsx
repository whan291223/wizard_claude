const SUITS = [
  { key: 'C', symbol: '♣', label: 'Clubs', color: 'text-gray-900', bg: 'hover:bg-gray-100' },
  { key: 'D', symbol: '♦', label: 'Diamonds', color: 'text-red-600', bg: 'hover:bg-red-50' },
  { key: 'H', symbol: '♥', label: 'Hearts', color: 'text-red-600', bg: 'hover:bg-red-50' },
  { key: 'S', symbol: '♠', label: 'Spades', color: 'text-gray-900', bg: 'hover:bg-gray-100' },
] as const

interface TrumpChooserProps {
  trumpCard: string | null
  isDealer: boolean
  onChoose: (suit: 'C' | 'D' | 'H' | 'S') => void
}

export default function TrumpChooser({ trumpCard, isDealer, onChoose }: TrumpChooserProps) {
  const cardLabel = trumpCard?.startsWith('W') ? 'Wizard' : 'Jester'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs space-y-4">
        <div className="text-center space-y-1">
          <div className="text-3xl">{trumpCard?.startsWith('W') ? '🧙' : '🎭'}</div>
          <p className="text-white font-semibold text-lg">
            A {cardLabel} was flipped!
          </p>
          {isDealer ? (
            <p className="text-gray-400 text-sm">
              You are the dealer — choose the trump suit.
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              Waiting for the dealer to choose the trump suit…
            </p>
          )}
        </div>

        {isDealer && (
          <div className="grid grid-cols-2 gap-3">
            {SUITS.map(({ key, symbol, label, color, bg }) => (
              <button
                key={key}
                onClick={() => onChoose(key)}
                className={`bg-white ${bg} ${color} rounded-xl p-4 font-bold text-center border-2 border-gray-200 active:scale-95 transition-transform touch-manipulation`}
              >
                <div className="text-3xl leading-none">{symbol}</div>
                <div className="text-xs mt-1 font-semibold tracking-wide uppercase">{label}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
