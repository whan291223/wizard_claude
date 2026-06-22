import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import type { PlayerInfo } from '../types/game'
import type { GameResult } from '../store/gameStore'

interface GameOverProps {
  result: GameResult
  players: PlayerInfo[]
}

export default function GameOver({ result, players }: GameOverProps) {
  const navigate = useNavigate()
  const reset = useGameStore((s) => s.reset)

  const ranked = [...players].sort(
    (a, b) => (result.final_scores[b.id] ?? 0) - (result.final_scores[a.id] ?? 0)
  )

  function handlePlayAgain() {
    reset()
    navigate('/')
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="fixed inset-0 ds-stage flex flex-col items-center justify-center z-70 p-4 pt-safe">
      <div className="relative w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-5xl">🧙</p>
          <h1 className="text-3xl font-display font-bold text-neon-yellow"
            style={{ textShadow: '0 0 18px rgba(255,216,61,.5)' }}>
            Game Over
          </h1>
        </div>

        <div className="ds-panel rounded-2xl p-5 space-y-3">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 font-ui ${i === 0 ? 'text-neon-yellow' : 'text-white'}`}
            >
              <span className="text-xl w-8 text-center">{medals[i] ?? `${i + 1}.`}</span>
              <span className="flex-1 font-display font-semibold">{p.nickname}</span>
              <span className={`font-display font-bold text-lg ${i === 0 ? 'text-neon-yellow' : 'text-glow-cyan'}`}>
                {result.final_scores[p.id] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <button onClick={handlePlayAgain} className="ds-btn purple w-full !text-lg !py-4">
          Play Again
        </button>
      </div>
    </div>
  )
}
