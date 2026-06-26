import type { GameState, RoundState } from '../../types/game'
import type { RoundResult } from '../../store/gameStore'
import type { TableTheme } from '../../theme/tableTheme'

/** Everything the two game layouts (oval table / stacked mobile) need to render and act. */
export interface GameViewModel {
  gameState: GameState
  roundState: RoundState
  playerId: string | null
  theme: TableTheme

  myTurn: boolean
  isBidding: boolean
  isPlaying: boolean
  myBidPending: boolean
  playableCards: Set<string> | null

  // bidding
  bid: number
  setBid: (n: number) => void
  nextValid: number | null
  prevValid: number | null
  forbiddenBid: number | null
  confirmBid: () => void
  pastBids: { nickname: string; bid: number }[]
  secs: number | null

  // actions
  onPlayCard: (card: string) => void
  onEmote: (emote: string) => void

  // emotes / misc
  activeEmotes: Record<string, string>
  roundHistory: RoundResult[]
  muted: boolean
  toggleMuted: () => void
  suppressModals: boolean

  // trump
  trumpDisplay: string
  trumpColor: string

  // drag (hand → center drop zone)
  dragActive: boolean
  dragInZone: boolean
  onDragChange: (isDragging: boolean, inPlayZone: boolean) => void
}
