import Card from './Card'
import type { PlayerInfo } from '../types/game'

interface TrickAreaProps {
  trick: Array<{ player_id: string; card: string }>
  players: PlayerInfo[]
  lastWinner: string | null
  trickWinnerId?: string | null
}

export default function TrickArea({ trick, players, lastWinner, trickWinnerId }: TrickAreaProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]))

  if (trick.length === 0 && lastWinner) {
    const winner = playerMap[lastWinner]
    return (
      <div className="text-center text-gray-400 text-sm">
        <span className="text-green-400 font-semibold">{winner?.nickname ?? 'Unknown'}</span>{' '}
        won the trick
      </div>
    )
  }

  if (trick.length === 0) {
    return (
      <div className="text-gray-600 text-sm text-center">Waiting for trick to start...</div>
    )
  }

  return (
    <div className="flex flex-wrap gap-4 items-end justify-center">
      {trick.map(({ player_id, card }) => {
        const player = playerMap[player_id]
        const isWinner = trickWinnerId === player_id

        return (
          <div key={player_id} className="flex flex-col items-center gap-1">
            <div
              className={`
                rounded-xl transition-all duration-300
                ${isWinner
                  ? 'ring-4 ring-green-400 shadow-xl shadow-green-500/40 scale-110'
                  : ''}
              `}
            >
              <Card card={card} size="lg" />
            </div>
            <span
              className={`text-xs transition-colors duration-300 ${
                isWinner ? 'text-green-400 font-semibold' : 'text-gray-400'
              }`}
            >
              {player?.nickname ?? '?'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
