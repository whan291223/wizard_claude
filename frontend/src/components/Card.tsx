import WizardCard from './WizardCard'
import { parseGameCard } from '../utils/cards'

// Old size tokens → WizardCard scale. The 80×120 base at these scales reproduces the
// previous lg/md/sm clamp maxes (76×114 / 64×96 / 52×78) and the same 2:3 aspect ratio.
const SIZE_SCALE: Record<string, number> = {
  sm: 0.65,
  md: 0.8,
  lg: 0.95,
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
