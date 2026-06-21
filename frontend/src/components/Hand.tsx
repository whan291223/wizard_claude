import { useState } from 'react'
import Card from './Card'

interface HandProps {
  cards: string[]
  onPlay: (card: string) => void
  myTurn: boolean
  playableCards?: Set<string> | null // null = all playable
}

interface DragState {
  card: string
  startY: number
  currentY: number
}

const PLAY_THRESHOLD = 80 // px upward to trigger play

export default function Hand({ cards, onPlay, myTurn, playableCards = null }: HandProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  // Reset selection when cards change (new round or card played)
  const prevCards = cards.join(',')

  const canPlay = (card: string) => !playableCards || playableCards.has(card)

  function play(card: string) {
    setSelected(null)
    setDrag(null)
    onPlay(card)
  }

  // ── Touch (mobile): drag up to play ──────────────────────────────────────
  function onTouchStart(e: React.TouchEvent, card: string) {
    if (!myTurn || !canPlay(card)) return
    const y = e.touches[0].clientY
    setSelected(card)
    setDrag({ card, startY: y, currentY: y })
  }

  function onTouchMove(e: React.TouchEvent, card: string) {
    if (!drag || drag.card !== card) return
    setDrag((d) => (d ? { ...d, currentY: e.touches[0].clientY } : null))
  }

  function onTouchEnd(_e: React.TouchEvent, card: string) {
    if (!drag || drag.card !== card) {
      setDrag(null)
      return
    }
    const movedUp = drag.startY - drag.currentY
    setDrag(null)
    if (movedUp >= PLAY_THRESHOLD) {
      play(card)
    }
    // else: keep card selected so user can try again
  }

  // ── Click (desktop): tap to select, tap again to play ────────────────────
  function onClick(card: string) {
    if (!myTurn || !canPlay(card)) return
    if (selected === card) {
      play(card)
    } else {
      setSelected(card)
    }
  }

  const overlap = cards.length > 7

  let hint = ''
  if (myTurn) {
    if (selected) hint = 'Swipe up or tap again to play · tap another to change'
    else hint = 'Tap a playable card to select'
  } else {
    hint = 'Your hand'
  }

  return (
    <div className="bg-gray-800/90 border-t border-gray-700 pb-safe select-none">
      <p className="text-gray-500 text-xs text-center pt-2 pb-1 px-4">{hint}</p>

      <div className="overflow-x-auto">
        <div
          className="flex px-4 pb-4 justify-center"
          style={{ gap: overlap ? '0px' : '6px' }}
          key={prevCards}
        >
          {cards.map((card, i) => {
            const isDragging = drag?.card === card
            const isSelected = selected === card
            const playable = canPlay(card)

            // How far the card has moved upward
            const rawLift = isDragging
              ? Math.max(0, drag.startY - drag.currentY)
              : isSelected
              ? 18
              : 0

            // When close to threshold, tint card green as feedback
            const nearThreshold = isDragging && rawLift >= PLAY_THRESHOLD * 0.6

            return (
              <div
                key={card}
                className="relative flex-shrink-0"
                style={{
                  marginLeft: overlap && i > 0 ? '-20px' : undefined,
                  zIndex: isSelected || isDragging ? 50 : i,
                  transform: `translateY(-${rawLift}px)`,
                  // Instant tracking while dragging, smooth spring back otherwise
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                  touchAction: myTurn ? 'none' : 'auto',
                  opacity: !playable ? 0.35 : 1,
                }}
                onTouchStart={(e) => onTouchStart(e, card)}
                onTouchMove={(e) => onTouchMove(e, card)}
                onTouchEnd={(e) => onTouchEnd(e, card)}
              >
                <div
                  className={`
                    rounded-lg transition-shadow duration-100
                    ${nearThreshold ? 'ring-2 ring-green-400 shadow-lg shadow-green-900/50' : ''}
                    ${isSelected && !isDragging ? 'ring-2 ring-purple-400' : ''}
                  `}
                >
                  <Card
                    card={card}
                    size="lg"
                    onClick={() => onClick(card)}
                    disabled={!myTurn || !playable}
                  />
                </div>
              </div>
            )
          })}

          {cards.length === 0 && (
            <p className="text-gray-600 text-sm py-4">No cards in hand</p>
          )}
        </div>
      </div>
    </div>
  )
}
