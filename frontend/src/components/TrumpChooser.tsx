const SUITS = [
  { code: 'C', label: '♣ Clubs', color: 'text-white' },
  { code: 'D', label: '♦ Diamonds', color: 'text-red-400' },
  { code: 'H', label: '♥ Hearts', color: 'text-red-400' },
  { code: 'S', label: '♠ Spades', color: 'text-white' },
]

interface TrumpChooserProps {
  onChoose: (suit: string) => void
}

export default function TrumpChooser({ onChoose }: TrumpChooserProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs space-y-4">
        <h2 className="text-xl font-bold text-white text-center">
          A Wizard was flipped!
        </h2>
        <p className="text-gray-400 text-sm text-center">Choose the trump suit</p>
        <div className="grid grid-cols-2 gap-3">
          {SUITS.map(({ code, label, color }) => (
            <button
              key={code}
              onClick={() => onChoose(code)}
              className={`bg-gray-700 hover:bg-gray-600 rounded-xl py-4 font-bold text-lg ${color} transition-colors`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
