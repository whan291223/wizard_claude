import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useGameWS } from '../hooks/useGameWS'
import Hand from '../components/Hand'
import TrickArea from '../components/TrickArea'
import Scoreboard from '../components/Scoreboard'
import PlayerStrip from '../components/PlayerStrip'
import Card from '../components/Card'
import EmotePicker from '../components/EmotePicker'
import RoundResult from '../components/RoundResult'
import GameOver from '../components/GameOver'
import { playSound, isMuted, toggleMute } from '../utils/sound'
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
  C: '♣ Clubs',
  D: '♦ Diamonds',
  H: '♥ Hearts',
  S: '♠ Spades',
  none: 'None',
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

// ── Pure view ────────────────────────────────────────────────────────────────

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
  const [dragActive, setDragActive] = useState(false)
  const [dragInZone, setDragInZone] = useState(false)
  const [bid, setBid] = useState(0)
  const [secs, setSecs] = useState<number | null>(null)
  const [emoteOpen, setEmoteOpen] = useState(false)
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

  const myTurn = gameState.players[gameState.current_player_seat]?.id === playerId
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
    if (!myTurn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSecs(null)
      return
    }
    if (isBidding) {
      const initial = forbiddenBid === 0 ? 1 : 0
      setBid(initial)
      bidRef.current = initial
    }
    playSound('yourTurn')
    // TODO: re-enable countdown timer for bid and play turns
    // setSecs(COUNTDOWN_SECS)
  }, [myTurn]) // eslint-disable-line react-hooks/exhaustive-deps

  // TODO: re-enable auto-submit at secs=0 for bidding and playing
  // useEffect(() => {
  //   if (secs === null) return
  //   if (secs === 0) {
  //     if (myBidPending && myTurn) {
  //       onBidRef.current(bidRef.current)
  //     } else if (myTurn && isPlaying && playableCards) {
  //       const card = roundState.hand.find((c) => playableCards.has(c))
  //       if (card) onPlayCardRef.current(card)
  //     }
  //     setSecs(null)
  //     return
  //   }
  //   const t = setTimeout(() => setSecs((s) => (s !== null ? s - 1 : null)), 1000)
  //   return () => clearTimeout(t)
  // }, [secs]) // eslint-disable-line react-hooks/exhaustive-deps

  function confirmBid() {
    onBid(bid)
    setSecs(null)
  }

  const trumpDisplay = SUIT_DISPLAY[gameState.trump_suit ?? 'none'] ?? gameState.trump_suit ?? '—'

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 pt-safe gap-2">
        <div className="text-sm text-gray-400 shrink-0">
          Round{' '}
          <span className="text-white font-bold">{gameState.current_round}</span>
          <span className="text-gray-600">/{gameState.total_rounds}</span>
        </div>

        {/* Trump: card image + suit name */}
        <div className="flex items-center gap-1.5 min-w-0">
          {gameState.trump_card && (
            <div className="shrink-0">
              <Card card={gameState.trump_card} size="sm" />
            </div>
          )}
          <div className="text-xs text-center leading-tight min-w-0">
            <div className="text-gray-500 truncate">Trump</div>
            <div className="font-bold text-yellow-400 truncate">{trumpDisplay}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setMuted(toggleMute())}
            className="text-gray-400 hover:text-white transition-colors text-base leading-none"
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <Scoreboard
            players={gameState.players}
            tricksWon={roundState.tricks_won}
            bids={roundState.bids}
            roundHistory={roundHistory}
          />
        </div>
      </div>

      {/* Player strip */}
      <PlayerStrip
        players={gameState.players}
        currentPlayerSeat={gameState.current_player_seat}
        playerId={playerId}
        bids={roundState.bids}
        tricksWon={roundState.tricks_won}
        phase={gameState.current_phase}
        activeEmotes={activeEmotes}
      />

      {/* "Your turn" banner with countdown */}
      {myTurn && isPlaying && (
        <div className="flex justify-center px-4 pt-2">
          <span className="animate-pulse bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide">
            Your turn to play a card
            {secs !== null && <span className="ml-1.5 opacity-75">({secs}s)</span>}
          </span>
        </div>
      )}

      {/* Center area */}
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
          myBidPending && myTurn && !suppressModals ? (
            /* ── Inline bid UI — hand stays visible below ── */
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="text-center">
                <p className="text-white font-semibold">
                  Round {gameState.current_round} — Place your bid
                </p>
                <p className="text-gray-400 text-xs">How many tricks will you win? (0–{gameState.current_round})</p>
              </div>

              {pastBids.length > 0 && (
                <div className="bg-gray-700/60 rounded-xl px-4 py-2 w-full space-y-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">Bids so far</p>
                  {pastBids.map(({ nickname, bid: b }) => (
                    <div key={nickname} className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">{nickname}</span>
                      <span className="text-white font-semibold text-sm">{b}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-5">
                <button
                  onClick={() => { if (prevValid !== null) setBid(prevValid) }}
                  disabled={prevValid === null}
                  className="w-11 h-11 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white text-2xl font-bold transition-colors"
                >
                  −
                </button>
                <span className="text-5xl font-bold text-white w-14 text-center">{bid}</span>
                <button
                  onClick={() => { if (nextValid !== null) setBid(nextValid) }}
                  disabled={nextValid === null}
                  className="w-11 h-11 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white text-2xl font-bold transition-colors"
                >
                  +
                </button>
              </div>

              {forbiddenBid !== null && (
                <p className="text-yellow-500 text-xs text-center">
                  Bid <span className="font-bold">{forbiddenBid}</span> not allowed — total bids can't equal {gameState.current_round}
                </p>
              )}

              <button
                onClick={confirmBid}
                disabled={bid === forbiddenBid}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>Confirm bid: {bid}</span>
                {secs !== null && (
                  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{secs}s</span>
                )}
              </button>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Waiting for all players to bid…</p>
          )
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
              trumpSuit={gameState.trump_suit}
            />
          </>
        )}
      </div>

      {/* Emote button */}
      <div className="flex justify-end px-3 pb-1">
        <button
          onClick={() => setEmoteOpen((o) => !o)}
          className={`text-lg w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
            emoteOpen ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
          aria-label="Send emote"
        >
          💬
        </button>
      </div>

      {/* Hand — always visible, including during bidding */}
      <Hand
        cards={roundState.hand}
        onPlay={onPlayCard}
        myTurn={myTurn && isPlaying}
        playableCards={playableCards}
        onDragChange={handleDragChange}
      />

      {/* Emote picker panel */}
      {emoteOpen && (
        <EmotePicker
          onSelect={onEmote}
          onClose={() => setEmoteOpen(false)}
        />
      )}
    </div>
  )
}
