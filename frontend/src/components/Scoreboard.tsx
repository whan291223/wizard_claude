import { useState } from 'react'
import type { PlayerInfo } from '../types/game'

interface ScoreboardProps {
  players: PlayerInfo[]
  tricksWon: Record<string, number>
  bids: Record<string, number | null>
}

export default function Scoreboard({ players, tricksWon, bids }: ScoreboardProps) {
  const [open, setOpen] = useState(false)

  const sorted = [...players].sort((a, b) => b.total_score - a.total_score)

  return (
    <>
      <button onClick={() => setOpen(true)} className="ds-iconbtn" title="Scores" aria-label="Scores">
        🏆
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="ds-panel rounded-2xl p-5 w-full max-w-xs space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-display font-bold text-white text-center">Scoreboard</h2>
            <table className="w-full text-sm font-ui">
              <thead>
                <tr className="text-ink-dim text-xs uppercase">
                  <th className="text-left py-1">Player</th>
                  <th className="text-right py-1">Bid</th>
                  <th className="text-right py-1">Tricks</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-t border-panel-edge">
                    <td className="py-2 text-white">{p.nickname}</td>
                    <td className="py-2 text-right text-ink-dim">{bids[p.id] ?? '—'}</td>
                    <td className="py-2 text-right text-ink-dim">{tricksWon[p.id] ?? 0}</td>
                    <td className="py-2 text-right font-bold text-neon-yellow font-display">
                      {p.total_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setOpen(false)} className="ds-btn slate w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
