import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useGameWS } from '../hooks/useGameWS'
import Hand from '../components/Hand'
import TrickArea from '../components/TrickArea'
import Scoreboard from '../components/Scoreboard'
import PlayerHud from '../components/PlayerHud'
import BidModal from '../components/BidModal'
import RoundResult from '../components/RoundResult'
import GameOver from '../components/GameOver'
import type { GameState, RoundState, PlayerInfo } from '../types/game'

function getPlayableCards(
  hand: string[],
  trick: Array<{ player_id: string; card: string }>,
): Set<string> {
  if (trick.length === 0) return new Set(hand)

  let ledSuit: string | null = null
  for (const { card } of trick) {
    if (!card.startsWith('N') && !card.startsWith('W')) {
      ledSuit = card[0]
      break
    }
  }
  if (!ledSuit) return new Set(hand)

  const hasSuit = hand.some(
    (c) => !c.startsWith('N') && !c.startsWith('W') && c[0] === ledSuit,
  )

  return new Set(
    hand.filter((card) => {
      if (card.startsWith('W') || card.startsWith('N')) return true
      if (!hasSuit) return true
      return card[0] === ledSuit
    }),
  )
}

const SUIT_SYMBOL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠' }
const SUIT_LABEL: Record<string, string> = {
  C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades', none: 'No Trump',
}

function isRedSuit(s: string | null | undefined) {
  return s === 'D' || s === 'H'
}

function formatTrumpCard(card: string | null): string {
  if (!card) return ''
  if (card.startsWith('W')) return 'Wizard'
  if (card.startsWith('N')) return 'Jester'
  const suit = SUIT_SYMBOL[card[0]] ?? card[0]
  return `${card.slice(1)}${suit}`
}

// Opponent seat slots positioned around the table
const SLOT_POS: Record<string, React.CSSProperties> = {
  ml: { top: '44%', left: '2.5%' },
  tl: { top: '8%', left: '3%' },
  tcl: { top: '6%', left: '31%' },
  tcr: { top: '6%', right: '31%' },
  tr: { top: '8%', right: '3%' },
  mr: { top: '44%', right: '2.5%' },
}
const RIGHT_SLOTS = new Set(['tr', 'mr', 'tcr'])
const LAYOUTS: Record<number, string[]> = {
  1: ['tcl'],
  2: ['ml', 'mr'],
  3: ['ml', 'tl', 'tr'],
  4: ['ml', 'tl', 'tr', 'mr'],
  5: ['ml', 'tl', 'tcl', 'tr', 'mr'],
}

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()

  const playerId = useGameStore((s) => s.playerId)
  const gameState = useGameStore((s) => s.gameState)
  const roundState = useGameStore((s) => s.roundState)
  const roundResult = useGameStore((s) => s.roundResult)
  const gameResult = useGameStore((s) => s.gameResult)
  const wsConnected = useGameStore((s) => s.wsConnected)
  const wsError = useGameStore((s) => s.wsError)
  const gameError = useGameStore((s) => s.gameError)
  const clearRoundResult = useGameStore((s) => s.clearRoundResult)
  const setWsError = useGameStore((s) => s.setWsError)
  const setGameError = useGameStore((s) => s.setGameError)

  const { send, reconnect } = useGameWS(roomCode ?? null, playerId)

  useEffect(() => {
    if (!playerId) navigate('/')
  }, [playerId, navigate])

  useEffect(() => {
    if (!gameError) return
    const t = setTimeout(() => setGameError(null), 3000)
    return () => clearTimeout(t)
  }, [gameError, setGameError])

  function handlePlayCard(card: string) {
    send('play_card', { card })
  }
  function handleBid(bid: number) {
    send('submit_bid', { bid })
  }
  function handleReconnect() {
    setWsError(null)
    reconnect()
  }

  if (gameResult) {
    return <GameOver result={gameResult} players={gameState?.players ?? []} />
  }

  if (!wsConnected) {
    return (
      <div className="h-full w-full ds-stage">
        {gameState && roundState && (
          <GameView
            gameState={gameState}
            roundState={roundState}
            playerId={playerId}
            onPlayCard={handlePlayCard}
            onBid={handleBid}
            suppressModals
          />
        )}
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-80 p-4">
          <div className="ds-panel rounded-2xl p-6 w-full max-w-xs text-center space-y-4">
            <div className="animate-pulse text-3xl">📡</div>
            <p className="text-white font-display font-semibold">
              {wsError ?? 'Reconnecting…'}
            </p>
            <p className="text-ink-dim text-sm">Your game is still running. Please wait.</p>
            <button onClick={handleReconnect} className="ds-btn purple w-full">
              Retry Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!gameState || !roundState) {
    return (
      <div className="h-full w-full ds-stage flex items-center justify-center">
        <p className="text-ink-dim font-display animate-pulse">Connecting…</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <GameView
        gameState={gameState}
        roundState={roundState}
        playerId={playerId}
        onPlayCard={handlePlayCard}
        onBid={handleBid}
        suppressModals={roundResult !== null}
      />

      {roundResult && (
        <RoundResult
          result={roundResult}
          players={gameState.players}
          roundNumber={roundResult.round_number}
          totalRounds={gameState.total_rounds}
          onContinue={clearRoundResult}
        />
      )}

      {gameError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-90 px-4 py-2 bg-red-900/90 border border-red-500/60 text-red-200 text-sm font-medium rounded-xl shadow-lg max-w-xs text-center pointer-events-none">
          {gameError}
        </div>
      )}
    </div>
  )
}

// ── Pure view: the stage ─────────────────────────────────────────────────────

interface GameViewProps {
  gameState: GameState
  roundState: RoundState
  playerId: string | null
  onPlayCard: (card: string) => void
  onBid: (bid: number) => void
  suppressModals?: boolean
}

function GameView({
  gameState,
  roundState,
  playerId,
  onPlayCard,
  onBid,
  suppressModals = false,
}: GameViewProps) {
  const [dragInZone, setDragInZone] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  function handleDragChange(isDragging: boolean, inPlayZone: boolean) {
    setDragActive(isDragging)
    setDragInZone(inPlayZone)
  }

  const myTurn = gameState.players[gameState.current_player_seat]?.id === playerId
  const isBidding = gameState.current_phase === 'bidding'
  const isPlaying = gameState.current_phase === 'playing'
  const myBidPending = isBidding && roundState.bids[playerId ?? ''] == null

  const playableCards =
    myTurn && isPlaying
      ? getPlayableCards(roundState.hand, roundState.current_trick)
      : null

  // Last-bidder rule
  const submittedBids = Object.values(roundState.bids).filter((v) => v !== null) as number[]
  const isLastBidder = myBidPending && submittedBids.length === gameState.num_players - 1
  const forbiddenBid = (() => {
    if (!isLastBidder) return null
    const f = gameState.current_round - submittedBids.reduce((a, b) => a + b, 0)
    return f >= 0 && f <= gameState.current_round ? f : null
  })()

  // Leader (highest total score), only if anyone is above 0
  const topScore = Math.max(0, ...gameState.players.map((p) => p.total_score))
  const leaderId =
    topScore > 0 ? gameState.players.find((p) => p.total_score === topScore)?.id : undefined

  // Opponents ordered by seat, starting right after me
  const mySeat = gameState.players.find((p) => p.id === playerId)?.seat_order ?? 0
  const sorted = [...gameState.players].sort((a, b) => a.seat_order - b.seat_order)
  const opponents: PlayerInfo[] = []
  for (let k = 1; k < sorted.length; k++) {
    opponents.push(sorted[(mySeat + k) % sorted.length])
  }
  const slots = LAYOUTS[opponents.length] ?? LAYOUTS[5]

  const trumpSuit = gameState.trump_suit ?? 'none'
  const trumpSym = SUIT_SYMBOL[trumpSuit] ?? null

  const currentName = gameState.players[gameState.current_player_seat]?.nickname ?? null

  return (
    <div className="ds-stage h-full w-full">
      {/* Round counter */}
      <div className="absolute top-[3%] left-1/2 -translate-x-1/2 z-[6] flex flex-col items-center pt-safe">
        <div className="ds-round-label">ROUND</div>
        <div className="ds-round-num">{gameState.current_round}</div>
        <div className="ds-round-label opacity-70" style={{ letterSpacing: '0.1em' }}>
          of {gameState.total_rounds}
        </div>
      </div>

      {/* Trump chip */}
      <div className="ds-trump pt-safe">
        <div
          className="grid place-items-center rounded-lg font-display"
          style={{
            width: 'clamp(26px,3.4vmax,42px)',
            aspectRatio: '1',
            fontSize: 'clamp(16px,2.2vmax,28px)',
            background: '#fbf6ee',
            color: isRedSuit(trumpSuit) ? 'var(--suit-red)' : 'var(--suit-dark)',
            border: '1px solid rgba(0,0,0,.18)',
          }}
        >
          {trumpSym ?? '∅'}
        </div>
        <div className="leading-tight">
          <div className="font-display text-neon-yellow" style={{ fontSize: 'clamp(11px,1.4vmax,16px)' }}>
            {SUIT_LABEL[trumpSuit] ?? trumpSuit}
          </div>
          {gameState.trump_card && (
            <div className="text-ink-dim" style={{ fontSize: 'clamp(8px,1vmax,12px)' }}>
              {formatTrumpCard(gameState.trump_card)} flipped
            </div>
          )}
        </div>
      </div>

      {/* Scores button (top-right) */}
      <div className="absolute top-[3.5%] right-[2.5%] z-[6] pt-safe">
        <Scoreboard
          players={gameState.players}
          tricksWon={roundState.tricks_won}
          bids={roundState.bids}
        />
      </div>

      {/* Opponents around the table */}
      {opponents.map((opp, i) => {
        const slot = slots[i] ?? 'tl'
        return (
          <PlayerHud
            key={opp.id}
            player={opp}
            isActive={opp.seat_order === gameState.current_player_seat}
            isLeader={opp.id === leaderId}
            isMe={false}
            bid={roundState.bids[opp.id] ?? null}
            tricks={roundState.tricks_won[opp.id] ?? 0}
            phase={gameState.current_phase}
            reverse={RIGHT_SLOTS.has(slot)}
            style={SLOT_POS[slot]}
          />
        )
      })}

      {/* Center: trick area or bidding prompt + drop-zone glow */}
      <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-[4] grid place-items-center">
        {dragActive && isPlaying && (
          <div
            className="absolute rounded-full transition-all duration-150 pointer-events-none"
            style={{
              width: 'clamp(160px,34vmax,420px)',
              aspectRatio: '1',
              boxShadow: dragInZone
                ? '0 0 0 3px #B9A0E8, 0 0 50px rgba(139,111,201,.5)'
                : '0 0 0 2px rgba(194,170,136,.4)',
            }}
          />
        )}
        {isBidding ? (
          <div className="text-center">
            <div className="ds-round-label">BIDDING</div>
            <p className="font-display text-ink mt-1" style={{ fontSize: 'clamp(13px,1.8vmax,22px)' }}>
              {myBidPending ? 'Place your bid' : `Waiting for ${currentName}…`}
            </p>
          </div>
        ) : (
          <TrickArea
            trick={roundState.current_trick}
            players={gameState.players}
            lastWinner={roundState.last_trick_winner}
            trickWinnerId={roundState.trick_winner_id}
            currentPlayerName={currentName}
          />
        )}
      </div>

      {/* Your-turn indicator */}
      {myTurn && isPlaying && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[6] flex items-center gap-2 px-4 py-1.5 rounded-full font-display"
          style={{
            bottom: 'clamp(150px,33vh,360px)',
            background: 'rgba(139,111,201,.16)',
            border: '1px solid rgba(185,160,232,.55)',
            color: '#d7c6f2',
            fontSize: 'clamp(11px,1.5vmax,17px)',
            boxShadow: '0 0 18px rgba(139,111,201,.35)',
            animation: 'ds-pulse 1.6s ease-in-out infinite',
          }}
        >
          ● Your turn
        </div>
      )}

      {/* Hand */}
      <div
        className="absolute bottom-[1.5%] left-1/2 -translate-x-1/2 z-[7]"
        style={{ width: 'min(94%, 760px)', height: 'clamp(120px,30vh,260px)' }}
      >
        <Hand
          cards={roundState.hand}
          onPlay={onPlayCard}
          myTurn={myTurn && isPlaying}
          playableCards={playableCards}
          onDragChange={handleDragChange}
        />
      </div>

      {/* Bid modal overlay */}
      {myBidPending && myTurn && !suppressModals && (
        <BidModal
          roundNumber={gameState.current_round}
          maxBid={gameState.current_round}
          onBid={onBid}
          forbiddenBid={forbiddenBid}
          players={gameState.players}
          bids={roundState.bids}
          playerId={playerId}
        />
      )}
    </div>
  )
}
