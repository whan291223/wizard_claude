import { useEffect, useState, useCallback } from 'react'
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
  const [copied, setCopied] = useState(false)

  const copyCode = useCallback(() => {
    if (!gameState) return
    navigator.clipboard.writeText(gameState.room_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [gameState])
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
          <div className="flex items-center justify-center gap-2">
            <span className="text-white font-mono font-bold tracking-widest text-2xl">
              {gameState.room_code}
            </span>
            <button
              onClick={copyCode}
              title="Copy room code"
              className="text-gray-500 hover:text-white active:text-green-400 transition-colors p-1 rounded"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-green-400 text-xs">Copied to clipboard!</p>
          )}
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
