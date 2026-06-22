import Card from './Card'
import type { PlayerInfo } from '../types/game'

interface TrickAreaProps {
  trick: Array<{ player_id: string; card: string }>
  players: PlayerInfo[]
  lastWinner: string | null
  trickWinnerId?: string | null
  currentPlayerName?: string | null
}

export default function TrickArea({
  trick,
  players,
  trickWinnerId,
  currentPlayerName,
}: TrickAreaProps) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]))
  const winnerName = trickWinnerId ? playerMap[trickWinnerId]?.nickname : null

  return (
    <div className="relative grid place-items-center" style={{ width: 'clamp(180px,40vmax,480px)' }}>
      {/* Glowing target triangle */}
      <svg
        viewBox="0 0 200 172"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
      >
        <polygon
          points="20,28 180,28 100,150"
          fill="rgba(232,199,122,.06)"
          stroke="#E8C77A"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 8px rgba(232,199,122,.6))' }}
        />
      </svg>

      <div className="relative flex flex-col items-center gap-[clamp(4px,1vmax,10px)] py-[6%]">
        {winnerName ? (
          <div
            className="font-display font-semibold text-neon-yellow"
            style={{ fontSize: 'clamp(12px,1.8vmax,22px)', textShadow: '0 0 12px rgba(232,199,122,.6)' }}
          >
            {winnerName} won the trick!
          </div>
        ) : (
          trick.length === 0 && (
            <div
              className="font-ui text-ink-dim text-center"
              style={{ fontSize: 'clamp(11px,1.5vmax,16px)' }}
            >
              {currentPlayerName
                ? `Waiting for ${currentPlayerName}…`
                : 'Waiting for the next card…'}
            </div>
          )
        )}

        {trick.length > 0 && (
          <div className="flex items-end justify-center gap-[clamp(2px,1.2vmax,12px)]">
            {trick.map(({ player_id, card }, i) => {
              const player = playerMap[player_id]
              const isWinner = trickWinnerId === player_id
              // gentle fan: outer cards tilt slightly
              const mid = (trick.length - 1) / 2
              const tilt = (i - mid) * 5
              return (
                <div key={player_id} className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-lg transition-all duration-300"
                    style={{
                      transform: isWinner ? 'scale(1.12)' : `rotate(${tilt}deg)`,
                      boxShadow: isWinner
                        ? '0 0 0 3px #E8C77A, 0 0 22px rgba(232,199,122,.55)'
                        : undefined,
                      borderRadius: 8,
                    }}
                  >
                    <Card card={card} size="lg" />
                  </div>
                  <span
                    className="font-display transition-colors duration-300"
                    style={{
                      fontSize: 'clamp(8px,1.1vmax,13px)',
                      color: isWinner ? '#E8C77A' : 'var(--txt-dim)',
                    }}
                  >
                    {player?.nickname ?? '?'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
