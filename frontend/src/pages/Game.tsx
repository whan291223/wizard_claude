import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useGameWS } from '../hooks/useGameWS'
import Hand from '../components/Hand'
import TrickArea from '../components/TrickArea'
import Scoreboard from '../components/Scoreboard'
import PlayerStrip from '../components/PlayerStrip'
import BidModal from '../components/BidModal'
import TrumpChooser from '../components/TrumpChooser'
import RoundResult from '../components/RoundResult'
import GameOver from '../components/GameOver'
import type { GameState, RoundState } from '../types/game'

const SUIT_DISPLAY: Record<string, string> = {
  C: '♣ Clubs',
  D: '♦ Diamonds',
  H: '♥ Hearts',
  S: '♠ Spades',
  none: 'None',
  pending: '?',
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
  const clearRoundResult = useGameStore((s) => s.clearRoundResult)
  const setWsError = useGameStore((s) => s.setWsError)

  const { send, reconnect } = useGameWS(roomCode ?? null, playerId)

  useEffect(() => {
    if (!playerId) navigate('/')
  }, [playerId, navigate])

  function handlePlayCard(card: string) {
    send('play_card', { card })
  }
  function handleBid(bid: number) {
    send('submit_bid', { bid })
  }
  function handleChooseTrump(suit: string) {
    send('choose_trump', { suit })
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
            onChooseTrump={handleChooseTrump}
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
        onChooseTrump={handleChooseTrump}
      />

      {roundResult && (
        <RoundResult
          result={roundResult}
          players={gameState.players}
          roundNumber={gameState.current_round}
          totalRounds={gameState.total_rounds}
          onContinue={clearRoundResult}
        />
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
  onChooseTrump: (suit: string) => void
}

function GameView({
  gameState,
  roundState,
  playerId,
  onPlayCard,
  onBid,
  onChooseTrump,
}: GameViewProps) {
  const myTurn = gameState.players[gameState.current_player_seat]?.id === playerId
  const isBidding = gameState.current_phase === 'bidding'
  const isPlaying = gameState.current_phase === 'playing'
  const myBidPending = isBidding && roundState.bids[playerId ?? ''] == null
  const isChoosingTrump =
    gameState.trump_suit === 'pending' &&
    gameState.players[gameState.dealer_seat]?.id === playerId

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
        <div className="text-sm text-center">
          <span className="text-gray-500">Trump </span>
          <span className="font-bold text-yellow-400">{trumpDisplay}</span>
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

      {/* Center area */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {isBidding ? (
          <div className="text-center space-y-2">
            <p className="text-gray-400 text-sm">
              {myBidPending && myTurn
                ? 'Place your bid'
                : 'Waiting for all players to bid...'}
            </p>
          </div>
        ) : (
          <TrickArea
            trick={roundState.current_trick}
            players={gameState.players}
            lastWinner={roundState.last_trick_winner}
            trickWinnerId={roundState.trick_winner_id}
          />
        )}
      </div>

      {/* Player hand */}
      <Hand
        cards={roundState.hand}
        onPlay={onPlayCard}
        myTurn={myTurn && isPlaying}
      />

      {/* Overlays */}
      {myBidPending && myTurn && (
        <BidModal
          roundNumber={gameState.current_round}
          maxBid={gameState.current_round}
          onBid={onBid}
        />
      )}
      {isChoosingTrump && <TrumpChooser onChoose={onChooseTrump} />}
    </div>
  )
}
