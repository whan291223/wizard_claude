import { useParams } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useGameWS } from '../hooks/useGameWS'
import Hand from '../components/Hand'
import TrickArea from '../components/TrickArea'
import Scoreboard from '../components/Scoreboard'
import BidModal from '../components/BidModal'
import TrumpChooser from '../components/TrumpChooser'

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const { playerId, gameState, roundState } = useGameStore()
  const { send } = useGameWS(roomCode ?? null, playerId)

  if (!gameState || !roundState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Connecting...</p>
      </div>
    )
  }

  const myTurn =
    gameState.players[gameState.current_player_seat]?.id === playerId

  function handlePlayCard(card: string) {
    if (!myTurn) return
    send('play_card', { card })
  }

  function handleBid(bid: number) {
    send('submit_bid', { bid })
  }

  function handleChooseTrump(suit: string) {
    send('choose_trump', { suit })
  }

  const isBidding = gameState.current_phase === 'bidding'
  const myBidPending = isBidding && roundState.bids[playerId ?? ''] == null

  const isChoosingTrump =
    gameState.trump_suit === 'pending' &&
    gameState.players[gameState.dealer_seat]?.id === playerId

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="text-sm text-gray-400">
          Round{' '}
          <span className="text-white font-bold">{gameState.current_round}</span>
          /{gameState.total_rounds}
        </div>
        <div className="text-sm">
          Trump:{' '}
          <span className="font-bold text-yellow-400">
            {gameState.trump_suit === 'none'
              ? 'None'
              : gameState.trump_suit === 'pending'
              ? '?'
              : gameState.trump_suit ?? '—'}
          </span>
        </div>
        <Scoreboard players={gameState.players} tricksWon={roundState.tricks_won} bids={roundState.bids} />
      </div>

      {/* Trick area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <TrickArea
          trick={roundState.current_trick}
          players={gameState.players}
          lastWinner={roundState.last_trick_winner}
        />
      </div>

      {/* Player hand */}
      <div className="pb-safe">
        <Hand
          cards={roundState.hand}
          onPlay={handlePlayCard}
          myTurn={myTurn && gameState.current_phase === 'playing'}
        />
      </div>

      {/* Overlays */}
      {myBidPending && myTurn && (
        <BidModal
          roundNumber={gameState.current_round}
          maxBid={gameState.current_round}
          onBid={handleBid}
        />
      )}

      {isChoosingTrump && (
        <TrumpChooser onChoose={handleChooseTrump} />
      )}
    </div>
  )
}
