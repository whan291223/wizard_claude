import { useState, useEffect, useRef } from 'react'
import Card from './Card'

interface HandProps {
  cards: string[]
  onPlay: (card: string) => void
  myTurn: boolean
  playableCards?: Set<string> | null
  onDragChange?: (isDragging: boolean, inPlayZone: boolean) => void
  /** Felt layouts: drop the solid grey bar for a transparent fade so cards sit on the table. */
  transparent?: boolean
  /** When transparent, whether to draw the dark bottom fade. Off during bidding so cards stay bright. */
  fade?: boolean
  /** Arc fan layout — used by the mobile felt table. Replaces the horizontal scroll. */
  fan?: boolean
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
const PLAY_ZONE = 0.52    // upper 52% of screen height = play zone

export default function Hand({
  cards,
  onPlay,
  myTurn,
  playableCards = null,
  onDragChange,
  transparent = false,
  fade = true,
  fan = false,
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
  const prevCards = cards.join(',')

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
      // No movement = a tap/click. selectedRef wasn't touched by this gesture, so it
      // reflects the selection BEFORE the tap: same card already selected → play; else select.
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

  // Global listeners registered once; they read dragRef so they never go stale,
  // and they're present before any pointerup so fast clicks aren't missed.
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

  const overlap = cards.length > 7

  let hint: string
  if (myTurn) {
    if (drag?.moved && inPlayZone) hint = 'Release to play!'
    else if (drag?.moved) hint = 'Drag up to the center to play'
    else if (selected) hint = 'Tap again to play · or drag it up'
    else hint = 'Tap a card to select'
  } else {
    hint = 'Your hand'
  }

  // ── Arc fan layout (mobile felt table) ──────────────────────────────────────
  if (fan) {
    const n = cards.length
    const gapX = n <= 1 ? 0 : Math.min(50, Math.floor(280 / (n - 1)))
    const step = n <= 6 ? 6 : 4
    const DIP = 7

    const dragGhost = drag?.moved && (
      <div
        className="fixed pointer-events-none"
        style={{ left: drag.clientX - drag.cardW / 2, top: drag.clientY - drag.cardH / 2, zIndex: 200, transform: inPlayZone ? 'scale(1.12)' : 'scale(1)', transition: 'transform 0.1s ease-out' }}
      >
        <div className={inPlayZone ? 'ring-4 ring-green-400 rounded-xl shadow-2xl shadow-green-500/50' : 'shadow-xl'}>
          <Card card={drag.card} size="lg" />
        </div>
      </div>
    )

    return (
      <div style={{ position: 'relative', height: 182, flexShrink: 0, userSelect: 'none' }}>
        {myTurn && (
          <div style={{ position: 'absolute', left: '50%', bottom: 30, transform: 'translateX(-50%)', width: 330, height: 24, borderRadius: 200, animation: 'gtmTurnRing 2s ease-in-out infinite', pointerEvents: 'none', zIndex: 1 }} />
        )}
        <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', width: 360, height: 160 }}>
          {cards.map((card, i) => {
            const t = i - (n - 1) / 2
            const baseTransform = `translateX(calc(-50% + ${(t * gapX).toFixed(1)}px)) translateY(${(Math.abs(t) * DIP).toFixed(1)}px) rotate(${(t * step).toFixed(1)}deg)`
            const liftTransform = `translateX(calc(-50% + ${(t * gapX).toFixed(1)}px)) translateY(${(Math.abs(t) * DIP - 18).toFixed(1)}px) rotate(${(t * step).toFixed(1)}deg)`
            const isDragging = drag?.card === card
            const isSelected = selected === card
            const playable = canPlay(card)
            return (
              <div
                key={card}
                ref={(el) => { cardElRefs.current[card] = el }}
                style={{
                  position: 'absolute', left: '50%', bottom: 0,
                  transform: isSelected && !isDragging ? liftTransform : baseTransform,
                  transformOrigin: '50% 100%',
                  zIndex: isSelected || isDragging ? 50 : i + 1,
                  opacity: isDragging ? 0.25 : 1,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                  touchAction: myTurn && playable ? 'none' : 'auto',
                }}
                onPointerDown={(e) => onPointerDown(e, card)}
              >
                {myTurn && playable && !isDragging && (
                  <div style={{ position: 'absolute', inset: -3, borderRadius: 13, animation: 'gtmPlayable 1.6s ease-in-out infinite', pointerEvents: 'none', zIndex: 2 }} />
                )}
                <div style={{ pointerEvents: 'none' }}>
                  <Card card={card} size="lg" selected={isSelected && !isDragging} />
                </div>
                {myTurn && !playable && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 11, background: 'linear-gradient(180deg,rgba(6,14,10,0.32),rgba(6,14,10,0.5))', pointerEvents: 'none', zIndex: 3, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: 999, background: 'rgba(0,0,0,0.62)', border: '1px solid rgba(255,255,255,0.16)' }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#d7e3da" strokeWidth="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round"/></svg>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {cards.length === 0 && (
            <p style={{ position: 'absolute', left: '50%', bottom: 40, transform: 'translateX(-50%)', color: '#5f7f6c', fontSize: 14, whiteSpace: 'nowrap' }}>No cards in hand</p>
          )}
        </div>
        <div style={{ position: 'absolute', left: '50%', bottom: 7, transform: 'translateX(-50%)', width: 128, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.4)', zIndex: 40, pointerEvents: 'none' }} />
        {dragGhost}
      </div>
    )
  }

  // ── Linear scroll layout (default) ───────────────────────────────────────────
  return (
    <div
      className={`pb-safe select-none ${transparent ? '' : 'bg-gray-800/90 border-t border-gray-700'}`}
      style={transparent && fade ? { background: 'linear-gradient(to top, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0))' } : undefined}
    >
      <p className={`text-xs text-center pt-2 pb-1 px-4 min-h-[1.5rem] ${transparent ? 'text-emerald-100/70' : 'text-gray-500'}`}>
        {hint}
      </p>

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

            return (
              <div
                key={card}
                ref={(el) => { cardElRefs.current[card] = el }}
                className="relative flex-shrink-0"
                style={{
                  marginLeft: overlap && i > 0 ? '-20px' : undefined,
                  zIndex: isSelected || isDragging ? 50 : i,
                  // Ghost while dragging; selected lifts up; unplayable fades
                  opacity: isDragging ? 0.25 : !playable ? 0.35 : 1,
                  // The card itself lifts when selected (WizardCard handles the transform + ring).
                  transition: isDragging ? 'none' : 'opacity 0.15s',
                  // Prevent the browser from scrolling/selecting while dragging a playable card
                  touchAction: myTurn && playable ? 'none' : 'auto',
                }}
                onPointerDown={(e) => onPointerDown(e, card)}
              >
                <div
                  // The inner card shouldn't capture the pointer — the wrapper owns the gesture
                  style={{ pointerEvents: 'none' }}
                >
                  <Card
                    card={card}
                    size="lg"
                    // Only grey out truly-unplayable cards during my play turn. When it's not my
                    // turn (bidding / opponent's turn) cards stay bright, just non-interactive.
                    disabled={myTurn && !playable}
                    selected={isSelected && !isDragging}
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

      {/* Floating card that follows finger / mouse during drag */}
      {drag?.moved && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: drag.clientX - drag.cardW / 2,
            top: drag.clientY - drag.cardH / 2,
            zIndex: 200,
            transform: inPlayZone ? 'scale(1.12)' : 'scale(1)',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <div className={inPlayZone ? 'ring-4 ring-green-400 rounded-xl shadow-2xl shadow-green-500/50' : 'shadow-xl'}>
            <Card card={drag.card} size="lg" />
          </div>
        </div>
      )}
    </div>
  )
}
