import type { PlayerInfo } from '../types/game'

interface PlayerStripProps {
  players: PlayerInfo[]
  currentPlayerSeat: number
  playerId: string | null
  bids: Record<string, number | null>
  tricksWon: Record<string, number>
  phase: string
}

export default function PlayerStrip({
  players,
  currentPlayerSeat,
  playerId,
  bids,
  tricksWon,
  phase,
}: PlayerStripProps) {
  const isBidding = phase === 'bidding'
  const isPlaying = phase === 'playing'

  return (
    <div className="flex gap-2 px-3 py-2 overflow-x-auto bg-gray-850 border-b border-gray-700/50">
      {players.map((p) => {
        const isActive = p.seat_order === currentPlayerSeat
        const isMe = p.id === playerId
        const bid = bids[p.id]
        const tricks = tricksWon[p.id] ?? 0

        let statusText = ''
        if (isBidding) {
          statusText = bid != null ? `bid ${bid}` : '…'
        } else if (isPlaying) {
          statusText = bid != null ? `${tricks}/${bid}` : `${tricks}`
        }

        return (
          <div
            key={p.id}
            className={`
              flex-shrink-0 flex flex-col items-center px-2 py-1 rounded-lg min-w-[52px]
              transition-colors duration-200
              ${isActive ? 'bg-green-900/60 ring-1 ring-green-600' : 'bg-gray-800'}
            `}
          >
            <span
              className={`text-xs font-semibold leading-tight truncate max-w-[56px] ${
                isMe ? 'text-purple-300' : isActive ? 'text-green-300' : 'text-gray-300'
              }`}
            >
              {isMe ? 'You' : p.nickname}
            </span>
            {statusText ? (
              <span className="text-[10px] text-gray-400 leading-tight">{statusText}</span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
