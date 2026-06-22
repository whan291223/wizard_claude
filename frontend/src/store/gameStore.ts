import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameState, RoundState, Suit } from '../types/game'

export interface RoundResult {
  round_number: number
  scores: Record<string, number>
  cumulative: Record<string, number>
  bids: Record<string, number>
  tricks_won: Record<string, number>
}

export interface GameResult {
  final_scores: Record<string, number>
}

interface GameStore {
  // Identity
  playerId: string | null
  nickname: string | null
  roomCode: string | null

  // Server state
  gameState: GameState | null
  roundState: RoundState | null
  wsError: string | null
  wsConnected: boolean

  // End-of-round / end-of-game overlays
  roundResult: RoundResult | null
  gameResult: GameResult | null

  // Per-round score history for the whole game (oldest first)
  roundHistory: RoundResult[]

  // Transient in-game error toast (game logic errors, not connection errors)
  gameError: string | null

  // Active emote speech bubbles — player_id → phrase (auto-clears after 4 s)
  activeEmotes: Record<string, string>

  // Actions
  setIdentity: (playerId: string, nickname: string, roomCode: string) => void
  setGameState: (state: GameState) => void
  setWsError: (msg: string | null) => void
  setWsConnected: (connected: boolean) => void
  setGameError: (msg: string | null) => void
  setRoundHand: (hand: string[]) => void
  setTrumpSuit: (suit: Suit) => void
  recordBid: (playerId: string, bid: number) => void
  revealBids: (bids: Record<string, number>) => void
  recordCardPlayed: (playerId: string, card: string) => void
  removeCardFromHand: (card: string) => void
  setTrickWinner: (winnerId: string) => void
  completeTrick: (winnerId: string) => void
  setRoundResult: (result: RoundResult) => void
  clearRoundResult: () => void
  setGameResult: (result: GameResult) => void
  addEmote: (playerId: string, emote: string) => void
  resetRound: () => void
  reset: () => void
}

const initialRoundState: RoundState = {
  hand: [],
  bids: {},
  tricks_won: {},
  current_trick: [],
  last_trick_winner: null,
  trick_winner_id: null,
}

// Module-level timers so auto-clear survives re-renders
const _emoteClearTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
  playerId: null,
  nickname: null,
  roomCode: null,
  gameState: null,
  roundState: null,
  wsError: null,
  wsConnected: false,
  roundResult: null,
  gameResult: null,
  roundHistory: [],
  gameError: null,
  activeEmotes: {},

  setIdentity: (playerId, nickname, roomCode) =>
    set({ playerId, nickname, roomCode }),

  setGameState: (gameState) => set({ gameState }),

  setWsError: (wsError) => set({ wsError }),

  setWsConnected: (wsConnected) => set({ wsConnected }),

  setGameError: (gameError) => set({ gameError }),

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
        trick_winner_id: null,
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

  revealBids: (bids) =>
    set((s) => ({
      roundState: s.roundState ? { ...s.roundState, bids } : s.roundState,
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

  setTrickWinner: (winnerId) =>
    set((s) => ({
      roundState: s.roundState
        ? { ...s.roundState, trick_winner_id: winnerId }
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
          trick_winner_id: null,
          last_trick_winner: winnerId,
        },
      }
    }),

  setRoundResult: (roundResult) =>
    set((s) => ({
      roundResult,
      // Append to history, replacing any existing entry for the same round
      roundHistory: [
        ...s.roundHistory.filter((r) => r.round_number !== roundResult.round_number),
        roundResult,
      ].sort((a, b) => a.round_number - b.round_number),
    })),

  clearRoundResult: () => set({ roundResult: null }),

  setGameResult: (gameResult) => set({ gameResult, roundResult: null }),

  addEmote: (playerId, emote) => {
    if (_emoteClearTimers[playerId]) clearTimeout(_emoteClearTimers[playerId])
    set((s) => ({ activeEmotes: { ...s.activeEmotes, [playerId]: emote } }))
    _emoteClearTimers[playerId] = setTimeout(() => {
      useGameStore.setState((s) => {
        const next = { ...s.activeEmotes }
        delete next[playerId]
        return { activeEmotes: next }
      })
      delete _emoteClearTimers[playerId]
    }, 4000)
  },

  resetRound: () =>
    set((s) => ({
      roundState: s.gameState
        ? {
            ...initialRoundState,
            tricks_won: Object.fromEntries(s.gameState.players.map((p) => [p.id, 0])),
          }
        : null,
    })),

  reset: () => {
    Object.values(_emoteClearTimers).forEach(clearTimeout)
    Object.keys(_emoteClearTimers).forEach((k) => delete _emoteClearTimers[k])
    set({
      playerId: null,
      nickname: null,
      roomCode: null,
      gameState: null,
      roundState: null,
      roundResult: null,
      gameResult: null,
      roundHistory: [],
      wsError: null,
      wsConnected: false,
      gameError: null,
      activeEmotes: {},
    })
  },
    }),
    {
      name: 'wizard-identity',
      // Only persist identity so a page refresh can rejoin the room.
      // Transient game state is re-sent by the server on WS reconnect.
      partialize: (s) => ({
        playerId: s.playerId,
        nickname: s.nickname,
        roomCode: s.roomCode,
      }),
    },
  ),
)
