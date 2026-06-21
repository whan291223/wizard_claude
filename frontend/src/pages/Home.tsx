import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const ADJECTIVES = ['Swift', 'Lucky', 'Brave', 'Wild', 'Silver', 'Golden', 'Dark', 'Wise', 'Bold', 'Jolly']
const NOUNS = ['Wizard', 'Jester', 'Mage', 'Oracle', 'Sphinx', 'Dragon', 'Phoenix', 'Raven', 'Fox', 'Wolf']

function randomName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}${noun}`
}

export default function Home() {
  const navigate = useNavigate()
  const setIdentity = useGameStore((s) => s.setIdentity)

  const [defaultName] = useState(randomName)
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const effectiveName = nickname.trim() || defaultName

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: effectiveName, max_players: maxPlayers }),
      })
      if (!res.ok) throw new Error('Failed to create game')
      const data = await res.json()
      setIdentity(data.player_id, effectiveName, data.room_code)
      navigate(`/lobby/${data.room_code}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!roomCode.trim()) return setError('Enter a room code')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/games/${roomCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: effectiveName }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Failed to join game')
      }
      const data = await res.json()
      setIdentity(data.player_id, effectiveName, data.room_code)
      navigate(`/lobby/${data.room_code}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-4xl font-bold text-center text-purple-400">Wizard</h1>
        <p className="text-gray-400 text-center text-sm">The trick-taking card game</p>

        <div className="relative">
          <input
            className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors ${
              nickname ? 'text-white' : 'text-gray-500'
            }`}
            placeholder={defaultName}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={32}
          />
          {!nickname && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">
              random
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-gray-400 text-sm whitespace-nowrap">Max players</label>
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            >
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Create Game
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-900 px-3 text-gray-500 text-sm">or join</span>
          </div>
        </div>

        <div className="space-y-3">
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase tracking-widest"
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Join Game
          </button>
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}
