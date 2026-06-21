import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import type { WsMessage } from '../types/game'

export function useGameWS(roomCode: string | null, playerId: string | null) {
  const ws = useRef<WebSocket | null>(null)
  const store = useGameStore()

  const send = useCallback((type: string, payload: unknown = {}) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  useEffect(() => {
    if (!roomCode || !playerId) return

    const url = `ws://${window.location.host}/ws/${roomCode}/${playerId}`
    const socket = new WebSocket(url)
    ws.current = socket

    socket.onmessage = (event) => {
      const msg: WsMessage = JSON.parse(event.data)
      handleMessage(msg, store)
    }

    socket.onclose = () => {
      ws.current = null
    }

    return () => {
      socket.close()
    }
  }, [roomCode, playerId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { send }
}

function handleMessage(msg: WsMessage, store: ReturnType<typeof useGameStore.getState>) {
  switch (msg.type) {
    case 'game_state': {
      store.setGameState(msg.payload as Parameters<typeof store.setGameState>[0])
      break
    }
    case 'round_started': {
      const p = msg.payload as { hand: string[] }
      store.setRoundHand(p.hand)
      break
    }
    case 'bid_submitted': {
      const p = msg.payload as { player_id: string; bid: number }
      store.recordBid(p.player_id, p.bid)
      break
    }
    case 'card_played': {
      const p = msg.payload as { player_id: string; card: string }
      store.recordCardPlayed(p.player_id, p.card)
      if (p.player_id === useGameStore.getState().playerId) {
        store.removeCardFromHand(p.card)
      }
      break
    }
    case 'trick_complete': {
      const p = msg.payload as { winner_id: string }
      store.completeTrick(p.winner_id)
      break
    }
    case 'round_complete':
    case 'game_complete':
      break
    default:
      break
  }
}
