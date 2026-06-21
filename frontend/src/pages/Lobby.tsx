import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { useGameWS } from '../hooks/useGameWS'

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const playerId = useGameStore((s) => s.playerId)
  const gameState = useGameStore((s) => s.gameState)
  const setGameState = useGameStore((s) => s.setGameState)
  const wsError = useGameStore((s) => s.wsError)
  const setWsError = useGameStore((s) => s.setWsError)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { send } = useGameWS(roomCode ?? null, playerId)

  useEffect(() => {
    if (!roomCode) return
    fetch(`/api/games/${roomCode}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`)
        return r.json()
      })
      .then(setGameState)
      .catch((e: Error) => setFetchError(e.message))
  }, [roomCode, setGameState])

  useEffect(() => {
    if (gameState?.status === 'in_progress') {
      navigate(`/game/${roomCode}`)
    }
  }, [gameState?.status, navigate, roomCode])

  // Identity lost (page refresh) — send back to home
  useEffect(() => {
    if (!playerId) navigate('/')
  }, [playerId, navigate])

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-medium">Could not load game</p>
          <p className="text-gray-500 text-sm">{fetchError}</p>
          <button
            onClick={() => navigate('/')}
            className="text-purple-400 underline text-sm"
          >
            Go back home
          </button>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const me = gameState.players.find((p) => p.id === playerId)
  const isHost = me?.is_host ?? false
  const canStart = gameState.num_players >= 3

  function handleStart() {
    setWsError(null)
    send('start_game', {})
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-purple-400">Lobby</h1>
          <p className="text-gray-400 text-sm">
            Room code:{' '}
            <span className="text-white font-mono font-bold tracking-widest">
              {gameState.room_code}
            </span>
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">
            Players ({gameState.num_players}/{gameState.max_players})
          </p>
          {gameState.players.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${p.is_connected ? 'bg-green-400' : 'bg-gray-600'}`}
              />
              <span className="text-white flex-1">{p.nickname}</span>
              {p.is_host && (
                <span className="text-xs text-purple-400 font-medium">host</span>
              )}
              {p.id === playerId && (
                <span className="text-xs text-gray-500">you</span>
              )}
            </div>
          ))}
        </div>

        {!canStart && (
          <p className="text-gray-500 text-sm text-center">
            Waiting for at least 3 players...
          </p>
        )}

        {isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Start Game
          </button>
        )}

        {!isHost && (
          <p className="text-gray-500 text-sm text-center">
            Waiting for the host to start...
          </p>
        )}

        {wsError && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg px-3 py-2">
            {wsError}
          </p>
        )}
      </div>
    </div>
  )
}
