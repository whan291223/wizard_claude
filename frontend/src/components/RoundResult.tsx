import type { PlayerInfo } from '../types/game'
import type { RoundResult as RoundResultData } from '../store/gameStore'

interface RoundResultProps {
  result: RoundResultData
  players: PlayerInfo[]
  roundNumber: number
  totalRounds: number
  onContinue: () => void
}

export default function RoundResult({
  result,
  players,
  roundNumber,
  totalRounds,
  onContinue,
}: RoundResultProps) {
  const isLastRound = roundNumber >= totalRounds

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="ds-panel rounded-2xl p-6 w-full max-w-sm space-y-5 font-ui">
        <div className="text-center">
          <p className="text-ink-dim text-xs uppercase tracking-wider">
            Round {roundNumber} of {totalRounds}
          </p>
          <h2 className="text-xl font-display font-bold text-white mt-1">Round Complete</h2>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-ink-dim text-xs uppercase">
              <th className="text-left py-1">Player</th>
              <th className="text-right py-1">Won/Bid</th>
              <th className="text-right py-1">Score</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const delta = result.scores[p.id] ?? 0
              const total = result.cumulative[p.id] ?? 0
              const bid = result.bids[p.id] ?? 0
              const won = result.tricks_won[p.id] ?? 0
              const hit = won === bid
              const positive = delta >= 0
              return (
                <tr key={p.id} className="border-t border-panel-edge">
                  <td className="py-2 text-white">{p.nickname}</td>
                  <td className={`py-2 text-right font-semibold font-display ${hit ? 'text-glow-cyan' : 'text-suit-red'}`}>
                    {won}/{bid}
                  </td>
                  <td className={`py-2 text-right font-semibold ${positive ? 'text-glow-cyan' : 'text-suit-red'}`}>
                    {positive ? '+' : ''}{delta}
                  </td>
                  <td className="py-2 text-right font-bold text-neon-yellow font-display">
                    {total}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <button onClick={onContinue} className="ds-btn purple w-full">
          {isLastRound ? 'See Final Results' : 'Next Round'}
        </button>
      </div>
    </div>
  )
}
