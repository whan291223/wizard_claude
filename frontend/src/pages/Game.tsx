import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useGameWS } from '../hooks/useGameWS'
import Hand from '../components/Hand'
import TrickArea from '../components/TrickArea'
import Scoreboard from '../components/Scoreboard'
import PlayerStrip from '../components/PlayerStrip'
import BidModal from '../components/BidModal'
import RoundResult from '../components/RoundResult'
import GameOver from '../components/GameOver'
import type { GameState, RoundState } from '../types/game'

function getPlayableCards(
  hand: string[],
  trick: Array<{ player_id: string; card: string }>,
): Set<string> {
  if (trick.length === 0) return new Set(hand)

  // Led suit = suit of the first non-Jester card in the trick
  let ledSuit: string | null = null
  for (const { card } of trick) {
    if (!card.startsWith('N') && !card.startsWith('W')) {
      ledSuit = card[0] // C / D / H / S
      break
    }
  }

  // All Jesters led → no suit constraint
  if (!ledSuit) return new Set(hand)

  const hasSuit = hand.some(
    (c) => !c.startsWith('N') && !c.startsWith('W') && c[0] === ledSuit,
  )

  return new Set(
    hand.filter((card) => {
      if (card.startsWith('W') || card.startsWith('N')) return true // always playable
      if (!hasSuit) return true // void in led suit → play anything
      return card[0] === ledSuit // must follow suit
    }),
  )
}

const SUIT_DISPLAY: Record<string, string> = {
  C: '♣ Clubs',
  D: '♦ Diamonds',
  H: '♥ Hearts',
  S: '♠ Spades',
  none: 'None',
}

const SUIT_SYMBOL: Record<string, string> = { C: '♣', D: '♦', H: '♥', S: '♠' }

function formatTrumpCard(card: string | null): string {
  if (!card) return ''
  if (card.startsWith('W')) return 'Wizard'
  if (card.startsWith('N')) return 'Jester'
  const suit = SUIT_SYMBOL[card[0]] ?? card[0]
  const rank = card.slice(1)
  return `${rank}${suit}`
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

  // Auto-dismiss game error toast after 3 s
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

  // ── Game over (permanent screen) ─────────────────────────────────────────
  if (gameResult) {
    return <GameOver result={gameResult} players={gameState?.players ?? []} />
  }

  // ── Disconnected overlay ──────────────────────────────────────────────────
  if (!wsConnected) {
    return (
      <>
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
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs text-center space-y-4">
            <div className="animate-pulse text-3xl">📡</div>
            <p className="text-white font-semibold">
              {wsError ?? 'Reconnecting...'}
            </p>
            <p className="text-gray-400 text-sm">
              Your game is still running. Please wait.
            </p>
            <button
              onClick={handleReconnect}
              className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Retry Now
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Loading (first connect, state not yet arrived) ────────────────────────
  if (!gameState || !roundState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Connecting...</p>
      </div>
    )
  }

  return (
    <>
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

      {/* Game error toast — auto-dismissed after 3 s */}
      {gameError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-90 px-4 py-2 bg-red-900/90 border border-red-500/60 text-red-200 text-sm font-medium rounded-xl shadow-lg max-w-xs text-center pointer-events-none">
          {gameError}
        </div>
      )}
    </>
  )
}

// ── Pure view: renders the game table, no store subscriptions ────────────────

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
  const [dragActive, setDragActive] = useState(false)
  const [dragInZone, setDragInZone] = useState(false)

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

  // Last-bidder rule: when all others have bid, compute the one forbidden value
  const submittedBids = Object.values(roundState.bids).filter((v) => v !== null) as number[]
  const isLastBidder = myBidPending && submittedBids.length === gameState.num_players - 1
  const forbiddenBid = (() => {
    if (!isLastBidder) return null
    const f = gameState.current_round - submittedBids.reduce((a, b) => a + b, 0)
    return f >= 0 && f <= gameState.current_round ? f : null
  })()

  const trumpDisplay =
    SUIT_DISPLAY[gameState.trump_suit ?? 'none'] ?? gameState.trump_suit ?? '—'

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 pt-safe">
        <div className="text-sm text-gray-400">
          Round{' '}
          <span className="text-white font-bold">{gameState.current_round}</span>
          <span className="text-gray-600">/{gameState.total_rounds}</span>
        </div>
        <div className="text-sm text-center leading-tight">
          <div>
            <span className="text-gray-500">Trump </span>
            <span className="font-bold text-yellow-400">{trumpDisplay}</span>
          </div>
          {gameState.trump_card && (
            <div className="text-xs text-gray-500">
              {formatTrumpCard(gameState.trump_card)} flipped
            </div>
          )}
        </div>
        <Scoreboard
          players={gameState.players}
          tricksWon={roundState.tricks_won}
          bids={roundState.bids}
        />
      </div>

      {/* Always-visible player strip */}
      <PlayerStrip
        players={gameState.players}
        currentPlayerSeat={gameState.current_player_seat}
        playerId={playerId}
        bids={roundState.bids}
        tricksWon={roundState.tricks_won}
        phase={gameState.current_phase}
      />

      {/* "Your turn" banner */}
      {myTurn && isPlaying && (
        <div className="flex justify-center px-4 pt-2">
          <span className="animate-pulse bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide">
            Your turn to play a card
          </span>
        </div>
      )}

      {/* Center area — also serves as the drag-to-play drop zone */}
      <div
        className={`flex-1 flex items-center justify-center p-4 min-h-0 rounded-lg transition-all duration-150 ${
          dragActive && isPlaying
            ? dragInZone
              ? 'ring-2 ring-green-400 bg-green-500/10'
              : 'ring-2 ring-dashed ring-gray-600 bg-gray-800/30'
            : ''
        }`}
      >
        {isBidding ? (
          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm">
              {myBidPending && myTurn
                ? 'Place your bid'
                : 'Waiting for all players to bid...'}
            </p>
          </div>
        ) : (
          <>
            {dragActive && isPlaying && (
              <p className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none z-10 transition-colors ${dragInZone ? 'text-green-400' : 'text-gray-500'}`}>
                {dragInZone ? 'Release to play!' : 'Drag here to play'}
              </p>
            )}
            <TrickArea
              trick={roundState.current_trick}
              players={gameState.players}
              lastWinner={roundState.last_trick_winner}
              trickWinnerId={roundState.trick_winner_id}
              currentPlayerName={
                gameState.players[gameState.current_player_seat]?.nickname ?? null
              }
            />
          </>
        )}
      </div>

      {/* Player hand */}
      <Hand
        cards={roundState.hand}
        onPlay={onPlayCard}
        myTurn={myTurn && isPlaying}
        playableCards={playableCards}
        onDragChange={handleDragChange}
      />

      {/* Overlays — suppressed while round summary is showing */}
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
