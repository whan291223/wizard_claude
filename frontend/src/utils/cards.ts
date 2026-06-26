import type { WizardColor, WizardVariant } from '../components/WizardCard'

// Suit → redesign color identity. C=Verdant, S=Azure, H=Scarlet, D=Fuchsia.
export const SUIT_COLOR: Record<string, WizardColor> = {
  C: 'dark',
  S: 'blue',
  H: 'crimson',
  D: 'rose',
}

// Wizard/Jester inherent suit by number — mirrors backend deck.py SPECIAL_SUITS.
export const SPECIAL_SUITS: Record<string, string> = {
  '1': 'C', '2': 'D', '3': 'H', '4': 'S',
}

export const SUIT_NAME: Record<string, string> = {
  C: 'Verdant', D: 'Fuchsia', H: 'Scarlet', S: 'Azure',
}

// Identity dot color per redesign color (from Game Table.dc.html dotColor).
export const COLOR_DOT: Record<WizardColor, string> = {
  dark: '#3fdd86',
  crimson: '#f4364a',
  rose: '#ff6ec2',
  blue: '#5a96ff',
}

// Identity colors handed out to seats around the table, in order.
export const SEAT_COLORS: WizardColor[] = ['crimson', 'blue', 'rose', 'dark', 'crimson', 'blue']

export interface ParsedCard {
  variant: WizardVariant
  color: WizardColor
  rank: string
  label: string
}

export function parseGameCard(card: string): ParsedCard {
  if (card.startsWith('W')) {
    const suit = SPECIAL_SUITS[card[1]] ?? 'C'
    const color = SUIT_COLOR[suit] ?? 'crimson'
    return { variant: 'wizard', color, rank: 'W', label: `Wizard ${SUIT_NAME[suit] ?? suit}` }
  }
  if (card.startsWith('N')) {
    const suit = SPECIAL_SUITS[card[1]] ?? 'C'
    const color = SUIT_COLOR[suit] ?? 'crimson'
    return { variant: 'jester', color, rank: 'N', label: `Jester ${SUIT_NAME[suit] ?? suit}` }
  }
  const suit = card[0]
  const rank = card.slice(1)
  const color = SUIT_COLOR[suit] ?? 'crimson'
  return { variant: 'number', color, rank, label: `${rank} of ${SUIT_NAME[suit] ?? suit}` }
}

export function cardColor(card: string): WizardColor {
  return parseGameCard(card).color
}
