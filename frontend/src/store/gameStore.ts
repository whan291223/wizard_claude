import { create } from 'zustand'
import type { GameState, RoundState, Suit } from '../types/game'

interface GameStore {
  // Identity
  playerId: string | null
  nickname: string | null
  roomCode: string | null

  // Server state
  gameState: GameState | null
  roundState: RoundState | null

  // Actions
  setIdentity: (playerId: string, nickname: string, roomCode: string) => void
  setGameState: (state: GameState) => void
  setRoundHand: (hand: string[]) => void
  setTrumpSuit: (suit: Suit) => void
  recordBid: (playerId: string, bid: number) => void
  recordCardPlayed: (playerId: string, card: string) => void
  removeCardFromHand: (card: string) => void
  completeTrick: (winnerId: string) => void
  resetRound: () => void
  reset: () => void
}

const initialRoundState: RoundState = {
  hand: [],
  bids: {},
  tricks_won: {},
  current_trick: [],
  last_trick_winner: null,
}

export const useGameStore = create<GameStore>((set) => ({
  playerId: null,
  nickname: null,
  roomCode: null,
  gameState: null,
  roundState: null,

  setIdentity: (playerId, nickname, roomCode) =>
    set({ playerId, nickname, roomCode }),

  setGameState: (gameState) => set({ gameState }),

  setRoundHand: (hand) =>
    set((s) => ({
      roundState: {
        ...(s.roundState ?? initialRoundState),
        hand,
        bids: {},
        tricks_won: Object.fromEntries(
          (s.gameState?.players ?? []).map((p) => [p.id, 0])
        ),
        current_trick: [],
        last_trick_winner: null,
      },
    })),

  setTrumpSuit: (suit) =>
    set((s) =>
      s.gameState ? { gameState: { ...s.gameState, trump_suit: suit } } : {}
    ),

  recordBid: (playerId, bid) =>
    set((s) => ({
      roundState: s.roundState
        ? { ...s.roundState, bids: { ...s.roundState.bids, [playerId]: bid } }
        : s.roundState,
    })),

  recordCardPlayed: (playerId, card) =>
    set((s) => ({
      roundState: s.roundState
        ? {
            ...s.roundState,
            current_trick: [...s.roundState.current_trick, { player_id: playerId, card }],
          }
        : s.roundState,
    })),

  removeCardFromHand: (card) =>
    set((s) => ({
      roundState: s.roundState
        ? { ...s.roundState, hand: s.roundState.hand.filter((c) => c !== card) }
        : s.roundState,
    })),

  completeTrick: (winnerId) =>
    set((s) => {
      if (!s.roundState) return {}
      const updated = { ...s.roundState.tricks_won }
      updated[winnerId] = (updated[winnerId] ?? 0) + 1
      return {
        roundState: {
          ...s.roundState,
          tricks_won: updated,
          current_trick: [],
          last_trick_winner: winnerId,
        },
      }
    }),

  resetRound: () =>
    set((s) => ({
      roundState: s.gameState
        ? {
            ...initialRoundState,
            tricks_won: Object.fromEntries(s.gameState.players.map((p) => [p.id, 0])),
          }
        : null,
    })),

  reset: () =>
    set({ playerId: null, nickname: null, roomCode: null, gameState: null, roundState: null }),
}))
