// Trick-resolution helpers shared by TrickArea (stacked) and CenterPile (table).

export interface TrickCard {
  player_id: string
  card: string
}

// Rank order for regular cards
const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, J: 11, Q: 12, K: 13, A: 14,
}

/**
 * Returns the player_id currently winning the in-progress trick, given the trump suit.
 * Mirrors backend resolution: Wizards beat everything (first wins), Jesters lose to anything,
 * trump beats led suit, else highest of led suit.
 */
export function getCurrentLeader(
  trick: TrickCard[],
  trumpSuit: string | null | undefined,
): string | null {
  if (trick.length === 0) return null
  let { player_id: winnerPid, card: winnerCard } = trick[0]
  let ledSuit: string | null = null
  if (!winnerCard.startsWith('W') && !winnerCard.startsWith('N')) {
    ledSuit = winnerCard[0]
  }

  for (let i = 1; i < trick.length; i++) {
    const { player_id: pid, card } = trick[i]
    if (!card.startsWith('W') && !card.startsWith('N') && ledSuit === null) {
      ledSuit = card[0]
    }
    if (winnerCard.startsWith('W')) break
    if (card.startsWith('W')) { winnerPid = pid; winnerCard = card; continue }
    if (winnerCard.startsWith('N')) {
      if (!card.startsWith('N')) { winnerPid = pid; winnerCard = card; continue }
      continue
    }
    if (card.startsWith('N')) continue
    const winnerSuit = winnerCard[0]
    const cardSuit = card[0]
    const isTrump = trumpSuit && trumpSuit !== 'none'
    if (isTrump && cardSuit === trumpSuit && winnerSuit !== trumpSuit) {
      winnerPid = pid; winnerCard = card; continue
    }
    if (cardSuit === winnerSuit) {
      const winnerRank = RANK_ORDER[winnerCard.slice(1)] ?? 0
      const cardRank = RANK_ORDER[card.slice(1)] ?? 0
      if (cardRank > winnerRank) { winnerPid = pid; winnerCard = card }
    }
  }
  return winnerPid
}
