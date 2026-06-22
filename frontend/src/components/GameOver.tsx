import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { playSound } from '../utils/sound'
import type { PlayerInfo } from '../types/game'
import type { GameResult } from '../store/gameStore'

interface GameOverProps {
  result: GameResult
  players: PlayerInfo[]
}

export default function GameOver({ result, players }: GameOverProps) {
  const navigate = useNavigate()
  const reset = useGameStore((s) => s.reset)

  // Triumphant flourish when the final results appear
  useEffect(() => {
    playSound('gameOver')
  }, [])

  const ranked = [...players].sort(
    (a, b) => (result.final_scores[b.id] ?? 0) - (result.final_scores[a.id] ?? 0)
  )

  function handlePlayAgain() {
    reset()
    navigate('/')
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-70 p-4 pt-safe">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-4xl">🧙</p>
          <h1 className="text-3xl font-bold text-purple-400">Game Over</h1>
        </div>

        <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 ${i === 0 ? 'text-yellow-300' : 'text-white'}`}
            >
              <span className="text-xl w-8 text-center">
                {medals[i] ?? `${i + 1}.`}
              </span>
              <span className="flex-1 font-semibold">{p.nickname}</span>
              <span className={`font-bold text-lg ${i === 0 ? 'text-yellow-300' : 'text-purple-400'}`}>
                {result.final_scores[p.id] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handlePlayAgain}
          className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  )
}
