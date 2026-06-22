import { useState } from 'react'
import type { PlayerInfo } from '../types/game'

interface BidModalProps {
  roundNumber: number
  maxBid: number
  onBid: (bid: number) => void
  forbiddenBid?: number | null
  players?: PlayerInfo[]
  bids?: Record<string, number | null>
  playerId?: string | null
}

export default function BidModal({
  roundNumber,
  maxBid,
  onBid,
  forbiddenBid = null,
  players = [],
  bids = {},
  playerId = null,
}: BidModalProps) {
  const [bid, setBid] = useState(() => (forbiddenBid === 0 ? 1 : 0))

  // Players who have already submitted a bid (not the current player)
  const pastBids = players
    .filter((p) => p.id !== playerId && bids[p.id] != null)
    .map((p) => ({ nickname: p.nickname, bid: bids[p.id] as number }))

  // Compute the next valid bid above/below current, skipping forbidden
  const nextValid = (() => {
    const next = bid + 1
    if (next > maxBid) return null
    if (next === forbiddenBid) return next + 1 > maxBid ? null : next + 1
    return next
  })()

  const prevValid = (() => {
    const prev = bid - 1
    if (prev < 0) return null
    if (prev === forbiddenBid) return prev - 1 < 0 ? null : prev - 1
    return prev
  })()

  function decrement() {
    if (prevValid !== null) setBid(prevValid)
  }

  function increment() {
    if (nextValid !== null) setBid(nextValid)
  }

  const isConfirmDisabled = bid === forbiddenBid

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="ds-panel rounded-2xl p-6 w-full max-w-xs space-y-5 font-ui">
        <h2 className="text-xl font-display font-bold text-white text-center">
          Round {roundNumber} — Place your bid
        </h2>
        <p className="text-ink-dim text-sm text-center">
          How many tricks will you win? (0–{maxBid})
        </p>

        {pastBids.length > 0 && (
          <div className="bg-black/25 border border-panel-edge rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-ink-dim text-xs uppercase tracking-wider mb-2">Bids so far</p>
            {pastBids.map(({ nickname, bid: b }) => (
              <div key={nickname} className="flex justify-between items-center">
                <span className="text-ink-dim text-sm">{nickname}</span>
                <span className="text-white font-semibold text-sm font-display">{b}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-5">
          <button
            onClick={decrement}
            disabled={prevValid === null}
            className="ds-iconbtn !w-12 !h-12 !text-2xl !text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="text-5xl font-display font-bold text-neon-yellow w-16 text-center"
            style={{ textShadow: '0 0 16px rgba(255,216,61,.5)' }}>
            {bid}
          </span>
          <button
            onClick={increment}
            disabled={nextValid === null}
            className="ds-iconbtn !w-12 !h-12 !text-2xl !text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        {forbiddenBid !== null && (
          <p className="text-neon-yellow text-xs text-center">
            Bid <span className="font-bold">{forbiddenBid}</span> is not allowed — total bids can't equal {roundNumber}
          </p>
        )}

        <button onClick={() => onBid(bid)} disabled={isConfirmDisabled} className="ds-btn purple w-full">
          Confirm bid: {bid}
        </button>
      </div>
    </div>
  )
}
