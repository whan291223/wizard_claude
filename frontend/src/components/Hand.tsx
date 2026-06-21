import { useState } from 'react'
import Card from './Card'

interface HandProps {
  cards: string[]
  onPlay: (card: string) => void
  myTurn: boolean
}

export default function Hand({ cards, onPlay, myTurn }: HandProps) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleTap(card: string) {
    if (!myTurn) return
    if (selected === card) {
      // Second tap on selected card → play it
      setSelected(null)
      onPlay(card)
    } else {
      setSelected(card)
    }
  }

  // Reset selection when hand changes (new round / card played)
  const handKey = cards.join(',')

  return (
    <div className="bg-gray-800/90 border-t border-gray-700 pb-safe">
      <p className="text-gray-500 text-xs text-center pt-2 pb-1">
        {myTurn
          ? selected
            ? 'Tap again to play'
            : 'Your turn — tap a card'
          : 'Your hand'}
      </p>

      {/* Overlapping fan for many cards, wrapping for few */}
      <div className="overflow-x-auto">
        <div
          className="flex px-4 pb-3 justify-center"
          style={{
            gap: cards.length > 7 ? '-8px' : '6px',
          }}
        >
          {cards.map((card, i) => (
            <div
              key={`${handKey}-${i}`}
              className="relative flex-shrink-0 transition-transform duration-150"
              style={{
                marginLeft: cards.length > 7 && i > 0 ? '-18px' : undefined,
                zIndex: selected === card ? 50 : i,
              }}
            >
              <Card
                card={card}
                size="lg"
                onClick={myTurn ? () => handleTap(card) : undefined}
                disabled={!myTurn}
                selected={selected === card}
              />
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-gray-600 text-sm py-4">No cards in hand</p>
          )}
        </div>
      </div>
    </div>
  )
}
