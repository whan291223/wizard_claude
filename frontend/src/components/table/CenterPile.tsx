import Card from '../Card'
import type { PlayerInfo } from '../../types/game'
import { getCurrentLeader } from '../../utils/trick'

interface CenterPileProps {
  trick: Array<{ player_id: string; card: string }>
  players: PlayerInfo[]
  playerId: string | null
  trumpSuit?: string | null
  trickWinnerId?: string | null
}

// Center trick pile ported from Game Table.dc.html — cards scattered around the
// middle with the player's name underneath and a winner/leader highlight.

export default function CenterPile({ trick, players, playerId, trumpSuit, trickWinnerId }: CenterPileProps) {
  if (trick.length === 0) return null

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]))
  const leaderId = trickWinnerId ?? getCurrentLeader(trick, trumpSuit)
  const n = trick.length

  return (
    <div style={{ position: 'relative', width: 380, height: 200 }}>
      {/* soft pulse behind the pile */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 150, height: 170, borderRadius: 16, animation: 'gtPilePulse 2.4s ease-in-out infinite', pointerEvents: 'none' }} />
      {trick.map(({ player_id, card }, i) => {
        const t = i - (n - 1) / 2
        const x = t * 62
        const y = (i % 2 === 0 ? 10 : -8) - Math.abs(t) * 2
        const rot = t * 6
        const isWinner = trickWinnerId === player_id
        const isLeading = !trickWinnerId && leaderId === player_id && n > 1
        const name = player_id === playerId ? 'You' : (playerMap[player_id]?.nickname ?? '?')
        return (
          <div key={player_id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`, zIndex: i + 1 }}>
            <div
              style={{
                borderRadius: 14,
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.5))',
                boxShadow: isWinner
                  ? '0 0 0 3px #4ade80, 0 0 22px 4px rgba(74,222,128,0.5)'
                  : isLeading
                  ? '0 0 0 2px #facc15, 0 0 16px 2px rgba(250,204,21,0.4)'
                  : 'none',
                transition: 'box-shadow .3s',
              }}
            >
              <Card card={card} size="md" />
            </div>
            <div style={{ position: 'absolute', left: '50%', bottom: -17, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: player_id === playerId ? '#9dffce' : '#cfe0d5', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,.7)' }}>
              {name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
