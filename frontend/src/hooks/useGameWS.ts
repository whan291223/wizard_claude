import { useEffect, useRef, useCallback, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { playSound } from '../utils/sound'
import type { GameState, Suit, WsMessage } from '../types/game'

export function useGameWS(roomCode: string | null, playerId: string | null) {
  const ws = useRef<WebSocket | null>(null)
  // Incrementing this causes the effect to re-run, creating a fresh socket.
  // Used for both auto-reconnect and manual reconnect.
  const [socketGen, setSocketGen] = useState(0)

  const reconnect = useCallback(() => setSocketGen((g) => g + 1), [])

  const send = useCallback((type: string, payload: unknown = {}) => {
    const msg = JSON.stringify({ type, payload })
    const socket = ws.current
    if (!socket) return
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(msg)
    } else if (socket.readyState === WebSocket.CONNECTING) {
      const onOpen = () => {
        socket.send(msg)
        socket.removeEventListener('open', onOpen)
      }
      socket.addEventListener('open', onOpen)
    }
  }, [])

  useEffect(() => {
    if (!roomCode || !playerId) return

    let intentionalClose = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws/${roomCode}/${playerId}`
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      useGameStore.getState().setWsConnected(true)
      useGameStore.getState().setWsError(null)
    }

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data)
        handleMessage(msg)
      } catch (e) {
        console.error('[WS] Failed to handle message', e)
      }
    }

    socket.onclose = () => {
      if (ws.current === socket) ws.current = null
      useGameStore.getState().setWsConnected(false)
      if (!intentionalClose) {
        // Auto-reconnect after 2 s; cleanup cancels this if component unmounts.
        retryTimer = setTimeout(() => setSocketGen((g) => g + 1), 2000)
      }
    }

    socket.onerror = () => {
      if (!intentionalClose) {
        useGameStore.getState().setWsError('Connection lost. Reconnecting...')
      }
    }

    return () => {
      intentionalClose = true
      if (retryTimer) clearTimeout(retryTimer)
      // Cancel any pending trick-highlight timer so it doesn't fire against stale state
      if (trickClearTimer) {
        clearTimeout(trickClearTimer)
        trickClearTimer = null
      }
      socket.close()
    }
  }, [roomCode, playerId, socketGen])

  return { send, reconnect }
}

// Module-level so rapid trick_complete events cancel the previous timer
let trickClearTimer: ReturnType<typeof setTimeout> | null = null
// Buffers next-round messages during the post-round trick animation window so the
// player sees the last trick winner before the UI switches to the new round
let pendingGameState: (() => void) | null = null
let pendingRoundStarted: (() => void) | null = null
let pendingGameComplete: (() => void) | null = null

function handleMessage(msg: WsMessage) {
  const store = useGameStore.getState()

  switch (msg.type) {
    case 'game_state': {
      const gs = msg.payload as GameState
      if (trickClearTimer) {
        pendingGameState = () => { pendingGameState = null; store.setGameState(gs) }
      } else {
        store.setGameState(gs)
      }
      break
    }

    case 'round_started': {
      const p = msg.payload as {
        hand: string[]
        trump_suit: string
        trump_card: string | null
        bids?: Record<string, number>
        current_trick?: Array<{ player_id: string; card: string }>
      }
      const applyRoundStarted = () => {
        // Cancel any pending trick-highlight timer so it doesn't fire into the new round
        if (trickClearTimer) {
          clearTimeout(trickClearTimer)
          trickClearTimer = null
        }
        pendingRoundStarted = null
        // Do NOT clearRoundResult here — let the user dismiss the overlay themselves
        store.setRoundHand(p.hand)
        if (p.trump_suit) store.setTrumpSuit(p.trump_suit as Suit)
        // On reconnect the server sends current bids/trick so state stays consistent
        if (p.bids && Object.keys(p.bids).length > 0) store.revealBids(p.bids)
        if (p.current_trick) {
          for (const { player_id, card } of p.current_trick) {
            store.recordCardPlayed(player_id, card)
          }
        }
      }
      // If the trick animation window is still active, buffer this so the player
      // doesn't see next round's hand flicker in before the round result overlay appears
      if (trickClearTimer) {
        pendingRoundStarted = applyRoundStarted
      } else {
        applyRoundStarted()
      }
      break
    }

    case 'bid_submitted': {
      const p = msg.payload as { player_id: string; bid: number }
      store.recordBid(p.player_id, p.bid)
      if (p.player_id === store.playerId) playSound('bidPlaced')
      break
    }

    case 'all_bids_in': {
      const p = msg.payload as { bids: Record<string, number> }
      store.revealBids(p.bids)
      break
    }

    case 'card_played': {
      const p = msg.payload as { player_id: string; card: string }
      store.recordCardPlayed(p.player_id, p.card)
      if (p.player_id === store.playerId) {
        store.removeCardFromHand(p.card)
        playSound('cardPlaySelf')
      } else {
        playSound('cardPlay')
      }
      break
    }

    case 'trick_complete': {
      const p = msg.payload as { winner_id: string }
      // Highlight the winning card for 1.5 s before clearing the trick
      if (trickClearTimer) clearTimeout(trickClearTimer)
      store.setTrickWinner(p.winner_id)
      playSound('trickWin')
      trickClearTimer = setTimeout(() => {
        useGameStore.getState().completeTrick(p.winner_id)
        trickClearTimer = null
      }, 1500)
      break
    }

    case 'round_complete': {
      const p = msg.payload as {
        scores: Record<string, number>
        cumulative_scores: Record<string, number>
        bids: Record<string, number>
        tricks_won: Record<string, number>
      }
      // Snapshot current_round and dealer_seat NOW — next game_state will overwrite them
      const snappedRound = store.gameState?.current_round ?? 0
      const snappedDealerSeat = store.gameState?.dealer_seat ?? 0
      const showResult = () => {
        store.setRoundResult({
          round_number: snappedRound,
          scores: p.scores,
          cumulative: p.cumulative_scores,
          bids: p.bids,
          tricks_won: p.tricks_won,
          dealer_seat: snappedDealerSeat,
        })
        playSound('roundComplete')
        // Flush buffered state now that the overlay is covering the UI
        if (pendingGameState) pendingGameState()
        if (pendingRoundStarted) pendingRoundStarted()
        if (pendingGameComplete) pendingGameComplete()
      }
      // If the last trick's winner highlight is still animating, wait for it to finish
      // before showing the round result overlay so the player can see who won
      if (trickClearTimer) {
        setTimeout(showResult, 1600)
      } else {
        showResult()
      }
      break
    }

    case 'game_complete': {
      const p = msg.payload as { final_scores: Record<string, number> }
      const apply = () => { pendingGameComplete = null; store.setGameResult({ final_scores: p.final_scores }) }
      if (trickClearTimer) {
        pendingGameComplete = apply
      } else {
        apply()
      }
      break
    }

    case 'emote_sent': {
      const p = msg.payload as { player_id: string; emote: string }
      store.addEmote(p.player_id, p.emote)
      playSound('emote')
      break
    }

    case 'error': {
      const p = msg.payload as { message: string }
      console.error('[WS game error]', p.message)
      store.setGameError(p.message)
      break
    }

    default:
      break
  }
}
