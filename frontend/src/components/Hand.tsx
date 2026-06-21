import Card from './Card'

interface HandProps {
  cards: string[]
  onPlay: (card: string) => void
  myTurn: boolean
}

export default function Hand({ cards, onPlay, myTurn }: HandProps) {
  return (
    <div className="bg-gray-800 border-t border-gray-700 p-4">
      <p className="text-gray-500 text-xs mb-3 text-center">
        {myTurn ? 'Your turn — tap a card to play' : 'Your hand'}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
        {cards.map((card) => (
          <Card
            key={card}
            card={card}
            size="lg"
            onClick={myTurn ? () => onPlay(card) : undefined}
            disabled={!myTurn}
          />
        ))}
        {cards.length === 0 && (
          <p className="text-gray-600 text-sm">No cards</p>
        )}
      </div>
    </div>
  )
}
