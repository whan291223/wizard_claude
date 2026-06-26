import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useGameWS } from '../hooks/useGameWS'
import { useIsWide } from '../hooks/useMediaQuery'
import GameOver from '../components/GameOver'
import RoundResult from '../components/RoundResult'
import TableLayout from '../components/table/TableLayout'
import StackedLayout from '../components/table/StackedLayout'
import type { GameViewModel } from '../components/table/viewModel'
import { isMuted, toggleMute, playSound } from '../utils/sound'
import { getTableTheme } from '../theme/tableTheme'
import type { RoundResult as RoundResultData } from '../store/gameStore'
import type { GameState, RoundState } from '../types/game'

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

const SUIT_DISPLAY: Record<string, string> = {
  C: 'Green',
  D: 'Pink',
  H: 'Red',
  S: 'Blue',
  none: 'None',
}

const SUIT_COLOR_HEX: Record<string, string> = {
  C: '#3fdd86',
  D: '#ff6ec2',
  H: '#f4364a',
  S: '#5a96ff',
  none: '#c7d8cd',
}

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()

  const playerId = useGameStore((s) => s.playerId)
  const gameState = useGameStore((s) => s.gameState)
  const roundState = useGameStore((s) => s.roundState)
  const roundResult = useGameStore((s) => s.roundResult)
  const gameResult = useGameStore((s) => s.gameResult)
  const roundHistory = useGameStore((s) => s.roundHistory)
  const activeEmotes = useGameStore((s) => s.activeEmotes)
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

  function handlePlayCard(card: string) { send('play_card', { card }) }
  function handleBid(bid: number) { send('submit_bid', { bid }) }
  function handleEmote(emote: string) { send('emote', { emote }) }
  function handleReconnect() { setWsError(null); reconnect() }

  if (gameResult) {
    return <GameOver result={gameResult} players={gameState?.players ?? []} />
  }

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
            onEmote={handleEmote}
            activeEmotes={activeEmotes}
            roundHistory={roundHistory}
            suppressModals
          />
        )}
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-80 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs text-center space-y-4">
            <div className="animate-pulse text-3xl">📡</div>
            <p className="text-white font-semibold">{wsError ?? 'Reconnecting...'}</p>
            <p className="text-gray-400 text-sm">Your game is still running. Please wait.</p>
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
        onEmote={handleEmote}
        activeEmotes={activeEmotes}
        roundHistory={roundHistory}
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
    </>
  )
}

// ── Logic hub — builds the view-model, then picks a responsive layout ──────────

interface GameViewProps {
  gameState: GameState
  roundState: RoundState
  playerId: string | null
  onPlayCard: (card: string) => void
  onBid: (bid: number) => void
  onEmote: (emote: string) => void
  activeEmotes: Record<string, string>
  roundHistory: RoundResultData[]
  suppressModals?: boolean
}

// const COUNTDOWN_SECS = 5  // TODO: restore when re-enabling the turn countdown

function GameView({
  gameState,
  roundState,
  playerId,
  onPlayCard,
  onBid,
  onEmote,
  activeEmotes,
  roundHistory,
  suppressModals = false,
}: GameViewProps) {
  const isWide = useIsWide()
  const [dragActive, setDragActive] = useState(false)
  const [dragInZone, setDragInZone] = useState(false)
  const [bid, setBid] = useState(0)
  const [secs] = useState<number | null>(null)
  const [muted, setMuted] = useState(isMuted())

  // Refs keep callbacks/values fresh inside timer effects
  const bidRef = useRef(0)
  const onBidRef = useRef(onBid)
  const onPlayCardRef = useRef(onPlayCard)
  useEffect(() => { onBidRef.current = onBid }, [onBid])
  useEffect(() => { onPlayCardRef.current = onPlayCard }, [onPlayCard])
  useEffect(() => { bidRef.current = bid }, [bid])

  function handleDragChange(isDragging: boolean, inPlayZone: boolean) {
    setDragActive(isDragging)
    setDragInZone(inPlayZone)
  }

  const myTurn = gameState.players.find((p) => p.seat_order === gameState.current_player_seat)?.id === playerId
  const isBidding = gameState.current_phase === 'bidding'
  const isPlaying = gameState.current_phase === 'playing'
  const myBidPending = isBidding && roundState.bids[playerId ?? ''] == null

  const playableCards =
    myTurn && isPlaying
      ? getPlayableCards(roundState.hand, roundState.current_trick)
      : null

  const submittedBids = Object.values(roundState.bids).filter((v) => v !== null) as number[]
  const isLastBidder = myBidPending && submittedBids.length === gameState.num_players - 1
  const forbiddenBid = (() => {
    if (!isLastBidder) return null
    const f = gameState.current_round - submittedBids.reduce((a, b) => a + b, 0)
    return f >= 0 && f <= gameState.current_round ? f : null
  })()

  // Bid +/− helpers
  const nextValid = (() => {
    const next = bid + 1
    if (next > gameState.current_round) return null
    if (next === forbiddenBid) return next + 1 > gameState.current_round ? null : next + 1
    return next
  })()
  const prevValid = (() => {
    const prev = bid - 1
    if (prev < 0) return null
    if (prev === forbiddenBid) return prev - 1 < 0 ? null : prev - 1
    return prev
  })()

  const pastBids = gameState.players
    .filter((p) => p.id !== playerId && roundState.bids[p.id] != null)
    .map((p) => ({ nickname: p.nickname, bid: roundState.bids[p.id] as number }))

  // Reset bid value when my turn begins + play the "your turn" cue
  useEffect(() => {
    if (!myTurn) return
    if (isBidding) {
      const initial = forbiddenBid === 0 ? 1 : 0
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBid(initial)
      bidRef.current = initial
    }
    playSound('yourTurn')
  }, [myTurn]) // eslint-disable-line react-hooks/exhaustive-deps

  function confirmBid() {
    onBid(bid)
  }

  const trumpDisplay = SUIT_DISPLAY[gameState.trump_suit ?? 'none'] ?? gameState.trump_suit ?? '—'
  const trumpColor = SUIT_COLOR_HEX[gameState.trump_suit ?? 'none'] ?? '#c7d8cd'

  const vm: GameViewModel = {
    gameState,
    roundState,
    playerId,
    theme: getTableTheme(),
    myTurn,
    isBidding,
    isPlaying,
    myBidPending,
    playableCards,
    bid,
    setBid,
    nextValid,
    prevValid,
    forbiddenBid,
    confirmBid,
    pastBids,
    secs,
    onPlayCard,
    onEmote,
    activeEmotes,
    roundHistory,
    muted,
    toggleMuted: () => setMuted(toggleMute()),
    suppressModals,
    trumpDisplay,
    trumpColor,
    dragActive,
    dragInZone,
    onDragChange: handleDragChange,
  }

  return isWide ? <TableLayout vm={vm} /> : <StackedLayout vm={vm} />
}
