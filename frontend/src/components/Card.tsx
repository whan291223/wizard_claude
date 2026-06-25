import WizardCard, { type WizardColor, type WizardVariant } from './WizardCard'

// Suit → redesign color identity. C=Onyx, S=Azure, H=Scarlet, D=Fuchsia.
const SUIT_COLOR: Record<string, WizardColor> = {
  C: 'dark',
  S: 'blue',
  H: 'crimson',
  D: 'rose',
}

// Wizard/Jester inherent suit by number — mirrors backend deck.py SPECIAL_SUITS.
const SPECIAL_SUITS: Record<string, string> = {
  '1': 'C', '2': 'D', '3': 'H', '4': 'S',
}

const SUIT_NAME: Record<string, string> = {
  C: 'Onyx', D: 'Fuchsia', H: 'Scarlet', S: 'Azure',
}

// Old size tokens → WizardCard scale. The 80×120 base at these scales reproduces the
// previous lg/md/sm clamp maxes (76×114 / 64×96 / 52×78) and the same 2:3 aspect ratio.
const SIZE_SCALE: Record<string, number> = {
  sm: 0.65,
  md: 0.8,
  lg: 0.95,
}

interface ParsedCard {
  variant: WizardVariant
  color: WizardColor
  rank: string
  label: string
}

function parseGameCard(card: string): ParsedCard {
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

interface CardProps {
  card: string
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  faceDown?: boolean
  selected?: boolean
}

export default function Card({
  card,
  onClick,
  disabled,
  size = 'md',
  faceDown,
  selected,
}: CardProps) {
  const { variant, color, rank, label } = parseGameCard(card)
  const scale = SIZE_SCALE[size] ?? SIZE_SCALE.md

  return (
    <div role="img" aria-label={faceDown ? 'Face-down card' : label}>
      <WizardCard
        variant={variant}
        color={color}
        rank={rank}
        scale={scale}
        faceDown={faceDown}
        selected={selected}
        disabled={disabled}
        interactive={!!onClick}
        onClick={onClick}
      />
    </div>
  )
}
