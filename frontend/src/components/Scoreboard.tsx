import { useState } from 'react'
import type { PlayerInfo } from '../types/game'
import type { RoundResult } from '../store/gameStore'

interface ScoreboardProps {
  players: PlayerInfo[]
  tricksWon: Record<string, number>
  bids: Record<string, number | null>
  roundHistory?: RoundResult[]
}

export default function Scoreboard({ players, tricksWon, bids, roundHistory = [] }: ScoreboardProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'current' | 'history'>('current')

  // Short, unique-ish labels for the history column headers
  const shortName = (n: string) => n.slice(0, 4)

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

            {/* Tab switch */}
            <div className="flex bg-gray-900 rounded-lg p-1 text-xs">
              <button
                onClick={() => setTab('current')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  tab === 'current' ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
              >
                This round
              </button>
              <button
                onClick={() => setTab('history')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  tab === 'history' ? 'bg-gray-700 text-white' : 'text-gray-400'
                }`}
              >
                History
              </button>
            </div>

            {tab === 'current' ? (
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
                      <td className="py-2 text-right text-gray-300">{bids[p.id] ?? '—'}</td>
                      <td className="py-2 text-right text-gray-300">{tricksWon[p.id] ?? 0}</td>
                      <td className="py-2 text-right font-bold text-purple-400">{p.total_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : roundHistory.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">No rounds completed yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 uppercase">
                      <th className="text-left py-1 pr-2">R</th>
                      {players.map((p) => (
                        <th key={p.id} className="text-right py-1 px-1 font-medium">
                          {shortName(p.nickname)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roundHistory.map((r) => (
                      <tr key={r.round_number} className="border-t border-gray-700/70">
                        <td className="py-1.5 pr-2 text-gray-400">{r.round_number}</td>
                        {players.map((p) => {
                          const delta = r.scores[p.id] ?? 0
                          return (
                            <td
                              key={p.id}
                              className={`py-1.5 px-1 text-right font-medium ${
                                delta >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {delta >= 0 ? '+' : ''}{delta}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {/* Running total from the most recent round's cumulative scores */}
                    <tr className="border-t-2 border-gray-600">
                      <td className="py-1.5 pr-2 text-gray-400 font-bold">Σ</td>
                      {players.map((p) => {
                        const last = roundHistory[roundHistory.length - 1]
                        const total = last?.cumulative[p.id] ?? 0
                        return (
                          <td key={p.id} className="py-1.5 px-1 text-right font-bold text-purple-400">
                            {total}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

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
