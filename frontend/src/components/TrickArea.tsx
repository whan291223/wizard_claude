import Card from './Card'
import type { PlayerInfo } from '../types/game'

interface TrickAreaProps {
  trick: Array<{ player_id: string; card: string }>
  players: PlayerInfo[]
  lastWinner: string | null
  trickWinnerId?: string | null
  currentPlayerName?: string | null
  trumpSuit?: string | null
}

// Rank order for regular cards
const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

function getCurrentLeader(
  trick: Array<{ player_id: string; card: string }>,
  trumpSuit: string | null | undefined,
): string | null {
  if (trick.length === 0) return null
  let { player_id: winnerPid, card: winnerCard } = trick[0]
  let ledSuit: string | null = null
  if (!winnerCard.startsWith('W') && !winnerCard.startsWith('N')) {
    ledSuit = winnerCard[0]
  }

  for (let i = 1; i < trick.length; i++) {
    const { player_id: pid, card } = trick[i]
    if (!card.startsWith('W') && !card.startsWith('N') && ledSuit === null) {
      ledSuit = card[0]
    }
    if (winnerCard.startsWith('W')) break
    if (card.startsWith('W')) { winnerPid = pid; winnerCard = card; continue }
    if (winnerCard.startsWith('N')) {
      if (!card.startsWith('N')) { winnerPid = pid; winnerCard = card; continue }
      continue
    }
    if (card.startsWith('N')) continue
    const winnerSuit = winnerCard[0]
    const cardSuit = card[0]
    const isTrump = trumpSuit && trumpSuit !== 'none'
    if (isTrump && cardSuit === trumpSuit && winnerSuit !== trumpSuit) {
      winnerPid = pid; winnerCard = card; continue
    }
    if (cardSuit === winnerSuit) {
      const winnerRank = RANK_ORDER[winnerCard.slice(1)] ?? 0
      const cardRank = RANK_ORDER[card.slice(1)] ?? 0
      if (cardRank > winnerRank) { winnerPid = pid; winnerCard = card }
    }
  }
  return winnerPid
}

export default function TrickArea({
  trick,
  players,
  trickWinnerId,
  currentPlayerName,
  trumpSuit,
}: TrickAreaProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]))

  if (trick.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center">
        {currentPlayerName
          ? `Waiting for ${currentPlayerName} to play...`
          : 'Waiting for trick to start...'}
      </div>
    )
  }

  // After trick resolves: use confirmed winner. While in progress: show current leader.
  const leaderId = trickWinnerId ?? getCurrentLeader(trick, trumpSuit)
  const winnerName = trickWinnerId ? playerMap[trickWinnerId]?.nickname : null

  return (
    <div className="flex flex-col items-center gap-3">
      {winnerName && (
        <div className="text-green-400 text-sm font-semibold animate-pulse">
          {winnerName} won the trick!
        </div>
      )}
      <div className="flex flex-wrap gap-4 items-end justify-center">
        {trick.map(({ player_id, card }) => {
          const player = playerMap[player_id]
          const isConfirmedWinner = trickWinnerId === player_id
          const isLeading = !trickWinnerId && leaderId === player_id && trick.length > 1

          return (
            <div key={player_id} className="flex flex-col items-center gap-1">
              <div
                className={`
                  rounded-xl transition-all duration-300
                  ${isConfirmedWinner
                    ? 'ring-4 ring-green-400 shadow-xl shadow-green-500/40 scale-110'
                    : isLeading
                    ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-500/30 scale-105'
                    : ''}
                `}
              >
                <Card card={card} size="lg" />
              </div>
              <span
                className={`text-xs transition-colors duration-300 ${
                  isConfirmedWinner
                    ? 'text-green-400 font-semibold'
                    : isLeading
                    ? 'text-yellow-400 font-semibold'
                    : 'text-gray-400'
                }`}
              >
                {player?.nickname ?? '?'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
