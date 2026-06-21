import { useState } from 'react'

interface BidModalProps {
  roundNumber: number
  maxBid: number
  onBid: (bid: number) => void
}

export default function BidModal({ roundNumber, maxBid, onBid }: BidModalProps) {
  const [bid, setBid] = useState(0)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs space-y-5">
        <h2 className="text-xl font-bold text-white text-center">
          Round {roundNumber} — Place your bid
        </h2>
        <p className="text-gray-400 text-sm text-center">
          How many tricks will you win? (0–{maxBid})
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setBid((b) => Math.max(0, b - 1))}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-bold transition-colors"
          >
            −
          </button>
          <span className="text-4xl font-bold text-white w-12 text-center">{bid}</span>
          <button
            onClick={() => setBid((b) => Math.min(maxBid, b + 1))}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-bold transition-colors"
          >
            +
          </button>
        </div>

        <button
          onClick={() => onBid(bid)}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Confirm bid: {bid}
        </button>
      </div>
    </div>
  )
}
