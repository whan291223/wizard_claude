import { useState, useEffect, useRef } from 'react'
import Card from './Card'

interface HandProps {
  cards: string[]
  onPlay: (card: string) => void
  myTurn: boolean
  playableCards?: Set<string> | null
  onDragChange?: (isDragging: boolean, inPlayZone: boolean) => void
}

interface DragState {
  card: string
  pointerId: number
  clientX: number
  clientY: number
  cardW: number
  cardH: number
  moved: boolean // true once finger/mouse has moved enough to count as a drag
}

const DRAG_THRESHOLD = 8  // px before a press becomes a drag
const PLAY_ZONE = 0.55    // upper 55% of screen height = play zone

export default function Hand({
  cards,
  onPlay,
  myTurn,
  playableCards = null,
  onDragChange,
}: HandProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  // Refs so the global pointer listeners never read stale state
  const dragRef = useRef<DragState | null>(null)
  // selectedRef is the SYNCHRONOUS source of truth for selection — updated together
  // with state via setSel(), never via an effect, so tap decisions can't see stale/early values.
  const selectedRef = useRef<string | null>(null)
  const onPlayRef = useRef(onPlay)
  const onDragChangeRef = useRef(onDragChange)
  useEffect(() => { onPlayRef.current = onPlay }, [onPlay])
  useEffect(() => { onDragChangeRef.current = onDragChange }, [onDragChange])

  function setSel(card: string | null) {
    selectedRef.current = card
    setSelected(card)
  }

  const cardElRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const canPlay = (card: string) => !playableCards || playableCards.has(card)
  const inPlayZone = drag ? drag.clientY < window.innerHeight * PLAY_ZONE : false
  const dragging = drag !== null && drag.moved

  // Notify parent so it can light up the drop zone
  useEffect(() => {
    onDragChangeRef.current?.(dragging, inPlayZone)
  }, [dragging, inPlayZone])

  function startDrag(card: string, pointerId: number, clientX: number, clientY: number) {
    const rect = cardElRefs.current[card]?.getBoundingClientRect()
    const state: DragState = {
      card,
      pointerId,
      clientX,
      clientY,
      cardW: rect?.width ?? 56,
      cardH: rect?.height ?? 80,
      moved: false,
    }
    dragRef.current = state
    setDrag(state)
    // NOTE: do NOT select here. A plain press must not change selection, or the
    // pointerup tap handler would see this card as "already selected" and play it.
  }

  function moveDrag(clientX: number, clientY: number) {
    const prev = dragRef.current
    if (!prev) return
    const moved =
      prev.moved ||
      Math.abs(clientX - prev.clientX) + Math.abs(clientY - prev.clientY) > DRAG_THRESHOLD
    const next = { ...prev, clientX, clientY, moved }
    dragRef.current = next
    setDrag(next)
  }

  function endDrag(clientY: number) {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    setDrag(null)

    const overZone = clientY < window.innerHeight * PLAY_ZONE
    if (d.moved) {
      // Released after a drag: play if dropped in the zone, otherwise keep selection as-is
      if (overZone) {
        setSel(null)
        onPlayRef.current(d.card)
      }
    } else {
      // No movement = a tap/click. selectedRef reflects the selection BEFORE this tap:
      // same card already selected → play; otherwise select it.
      if (selectedRef.current === d.card) {
        setSel(null)
        onPlayRef.current(d.card)
      } else {
        setSel(d.card)
      }
    }
  }

  // Single pointer model handles mouse AND touch — no simulated-mouse double-fire.
  function onPointerDown(e: React.PointerEvent, card: string) {
    if (!myTurn || !canPlay(card)) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startDrag(card, e.pointerId, e.clientX, e.clientY)
  }

  // Global listeners registered once; they read dragRef so they never go stale.
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      moveDrag(e.clientX, e.clientY)
    }
    function onPointerUp(e: PointerEvent) {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      endDrag(e.clientY)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

  const n = cards.length
  // Fan geometry: cap the total arc so big hands still fit
  const spread = n > 1 ? Math.min(5.5, 56 / (n - 1)) : 0
  const startAngle = -((n - 1) / 2) * spread

  let hint = ''
  if (myTurn) {
    if (drag?.moved && inPlayZone) hint = 'Release to play!'
    else if (drag?.moved) hint = 'Drag up to the center'
    else if (selected) hint = 'Tap again — or drag up — to play'
    else hint = 'Tap a card to pick it'
  }

  return (
    <div className="relative w-full h-full select-none">
      {hint && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 font-display text-ink-dim text-center whitespace-nowrap"
          style={{ fontSize: 'clamp(10px,1.3vmax,15px)' }}
        >
          {hint}
        </div>
      )}

      {/* Fanned hand anchored to the bottom-center */}
      <div className="absolute bottom-0 left-0 right-0 top-[clamp(14px,2.4vmax,30px)]">
        {cards.map((card, i) => {
          const isDragging = drag?.card === card
          const isSelected = selected === card
          const playable = canPlay(card)
          const angle = startAngle + i * spread

          const baseTransform = `translateX(-50%) rotate(${angle}deg)`
          const liftTransform = `translateX(-50%) translateY(-18px) rotate(${angle}deg)`

          return (
            <div
              key={card}
              ref={(el) => { cardElRefs.current[card] = el }}
              className="absolute bottom-0 left-1/2"
              style={{
                transformOrigin: '50% 340%',
                transform: isSelected && !isDragging ? liftTransform : baseTransform,
                zIndex: isSelected || isDragging ? 60 : i,
                opacity: isDragging ? 0.22 : !playable ? 0.4 : 1,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out, opacity 0.15s',
                touchAction: myTurn && playable ? 'none' : 'auto',
                filter: isSelected && !isDragging ? 'drop-shadow(0 10px 16px rgba(0,0,0,.55))' : undefined,
              }}
              onPointerDown={(e) => onPointerDown(e, card)}
            >
              <Card card={card} size="lg" disabled={!myTurn || !playable} />
            </div>
          )
        })}

        {n === 0 && (
          <p className="absolute left-1/2 -translate-x-1/2 bottom-2 text-ink-dim text-sm font-ui">
            No cards
          </p>
        )}
      </div>

      {/* Floating card that follows finger / mouse during drag */}
      {drag?.moved && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: drag.clientX - drag.cardW / 2,
            top: drag.clientY - drag.cardH / 2,
            zIndex: 200,
            transform: inPlayZone ? 'scale(1.14)' : 'scale(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div className={inPlayZone ? 'ring-4 ring-glow-cyan rounded-xl shadow-2xl' : 'shadow-xl rounded-xl'}>
            <Card card={drag.card} size="lg" />
          </div>
        </div>
      )}
    </div>
  )
}
