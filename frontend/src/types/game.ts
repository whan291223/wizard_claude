export type GameStatus = 'waiting' | 'in_progress' | 'finished'
export type GamePhase = 'waiting' | 'dealing' | 'bidding' | 'playing' | 'scoring'
export type Suit = 'C' | 'D' | 'H' | 'S' | 'none' | null

export interface PlayerInfo {
  id: string
  nickname: string
  seat_order: number
  is_host: boolean
  total_score: number
  is_connected: boolean
}

export interface GameState {
  game_id: string
  room_code: string
  status: GameStatus
  num_players: number
  max_players: number
  current_round: number
  total_rounds: number
  current_phase: GamePhase
  dealer_seat: number
  current_player_seat: number
  trump_suit: Suit
  trump_card: string | null
  players: PlayerInfo[]
}

export interface RoundState {
  hand: string[]
  bids: Record<string, number | null>
  tricks_won: Record<string, number>
  current_trick: Array<{ player_id: string; card: string }>
  last_trick_winner: string | null
  trick_winner_id: string | null  // set during the 1.5 s highlight window
}

// WebSocket message shapes
export interface WsMessage {
  type: string
  payload: unknown
}

export interface WsGameState extends WsMessage {
  type: 'game_state'
  payload: GameState
}

export interface WsRoundStarted extends WsMessage {
  type: 'round_started'
  payload: {
    round_number: number
    hand: string[]
    trump_card: string | null
    trump_suit: Suit
    dealer_seat: number
    first_bidder_seat: number
  }
}

export interface WsCardPlayed extends WsMessage {
  type: 'card_played'
  payload: { player_id: string; card: string }
}

export interface WsTrickComplete extends WsMessage {
  type: 'trick_complete'
  payload: { winner_id: string; cards: Array<{ player_id: string; card: string }> }
}

export interface WsRoundComplete extends WsMessage {
  type: 'round_complete'
  payload: { scores: Record<string, number>; cumulative_scores: Record<string, number> }
}

export interface WsGameComplete extends WsMessage {
  type: 'game_complete'
  payload: { final_scores: Record<string, number> }
}
