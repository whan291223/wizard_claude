import type { PlayerInfo } from '../types/game'

interface PlayerHudProps {
  player: PlayerInfo
  isActive: boolean
  isLeader: boolean
  isMe: boolean
  bid: number | null
  tricks: number
  phase: string
  reverse?: boolean // right-side HUDs mirror their layout
  style?: React.CSSProperties
}

const MAX_PIPS = 9

export default function PlayerHud({
  player,
  isActive,
  isLeader,
  isMe,
  bid,
  tricks,
  phase,
  reverse,
  style,
}: PlayerHudProps) {
  const isPlaying = phase === 'playing'
  const isBidding = phase === 'bidding'
  const letter = (player.nickname[0] ?? '?').toUpperCase()

  // During play, pips visualize tricks won out of the bid target
  const pipCount = bid != null ? Math.min(bid, MAX_PIPS) : 0

  const classes = ['ds-hud', isActive ? 'active' : '', isLeader ? 'leader' : '']
    .filter(Boolean)
    .join(' ')

  const meta = (
    <div className="ds-meta" style={{ alignItems: reverse ? 'flex-end' : 'flex-start' }}>
      <div className="ds-name">
        {isMe ? 'You' : player.nickname}
        {!player.is_connected && <span className="opacity-50"> ⚠</span>}
      </div>

      <div className="ds-pips" style={{ flexDirection: reverse ? 'row-reverse' : 'row' }}>
        {isBidding && bid == null ? (
          <span className="text-[clamp(10px,1.3vmax,15px)] text-ink-dim">bidding…</span>
        ) : (
          <>
            {pipCount > 0 &&
              Array.from({ length: pipCount }).map((_, i) => (
                <i key={i} className={isPlaying && i < tricks ? 'won' : ''} />
              ))}
            {isPlaying && bid != null && (
              <span className="text-[clamp(9px,1.2vmax,14px)] text-ink-dim ml-1">
                {tricks}/{bid}
              </span>
            )}
            {isBidding && bid != null && (
              <span className="text-[clamp(9px,1.2vmax,14px)] text-ink-dim">bid {bid}</span>
            )}
            <b className="ds-score">{player.total_score}</b>
          </>
        )}
      </div>
    </div>
  )

  const avatar = (
    <div className="ds-av">
      {isLeader && <span className="ds-crown">👑</span>}
      <span className="ds-av-letter">{letter}</span>
    </div>
  )

  return (
    <div className={classes} style={{ ...style, flexDirection: reverse ? 'row-reverse' : 'row' }}>
      {avatar}
      {meta}
    </div>
  )
}
