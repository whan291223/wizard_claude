import { useState } from 'react'
import type { PlayerInfo } from '../types/game'

interface ScoreboardProps {
  players: PlayerInfo[]
  tricksWon: Record<string, number>
  bids: Record<string, number | null>
}

export default function Scoreboard({ players, tricksWon, bids }: ScoreboardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Scores
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-gray-800 rounded-2xl p-5 w-full max-w-xs space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white text-center">Scoreboard</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase">
                  <th className="text-left py-1">Player</th>
                  <th className="text-right py-1">Bid</th>
                  <th className="text-right py-1">Tricks</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-gray-700">
                    <td className="py-2 text-white">{p.nickname}</td>
                    <td className="py-2 text-right text-gray-300">
                      {bids[p.id] ?? '—'}
                    </td>
                    <td className="py-2 text-right text-gray-300">
                      {tricksWon[p.id] ?? 0}
                    </td>
                    <td className="py-2 text-right font-bold text-purple-400">
                      {p.total_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setOpen(false)}
              className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
