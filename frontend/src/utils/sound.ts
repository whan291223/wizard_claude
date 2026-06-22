// Lightweight sound effects synthesized with the Web Audio API — no asset files.
// Browsers block audio until a user gesture, so the context is created lazily and
// resumed on first use; we also attach a one-time unlock on the first pointer/key event.

let ctx: AudioContext | null = null
let muted = false

const STORAGE_KEY = 'wizard-muted'

// Restore mute preference
try {
  muted = localStorage.getItem(STORAGE_KEY) === '1'
} catch {
  /* localStorage unavailable — default to unmuted */
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneSpec {
  freq: number
  start: number // seconds offset from now
  duration: number
  type?: OscillatorType
  gain?: number
}

function playTones(tones: ToneSpec[]) {
  if (muted) return
  const audio = getCtx()
  if (!audio) return
  const now = audio.currentTime

  for (const t of tones) {
    const osc = audio.createOscillator()
    const gainNode = audio.createGain()
    osc.type = t.type ?? 'sine'
    osc.frequency.value = t.freq

    const peak = t.gain ?? 0.15
    const startAt = now + t.start
    const endAt = startAt + t.duration
    // Short attack + exponential decay so notes don't click
    gainNode.gain.setValueAtTime(0.0001, startAt)
    gainNode.gain.exponentialRampToValueAtTime(peak, startAt + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt)

    osc.connect(gainNode).connect(audio.destination)
    osc.start(startAt)
    osc.stop(endAt + 0.02)
  }
}

export type SoundName =
  | 'cardPlay'
  | 'cardPlaySelf'
  | 'trickWin'
  | 'yourTurn'
  | 'bidPlaced'
  | 'roundComplete'
  | 'gameOver'
  | 'emote'

const SOUNDS: Record<SoundName, ToneSpec[]> = {
  // Soft click for another player's card
  cardPlay: [{ freq: 320, start: 0, duration: 0.08, type: 'triangle', gain: 0.08 }],
  // Slightly brighter for your own card
  cardPlaySelf: [{ freq: 440, start: 0, duration: 0.1, type: 'triangle', gain: 0.12 }],
  // Rising two-note flourish when a trick is won
  trickWin: [
    { freq: 523, start: 0, duration: 0.12, type: 'sine', gain: 0.13 },
    { freq: 784, start: 0.1, duration: 0.18, type: 'sine', gain: 0.13 },
  ],
  // Gentle ping when it's your turn
  yourTurn: [
    { freq: 660, start: 0, duration: 0.12, type: 'sine', gain: 0.12 },
    { freq: 880, start: 0.09, duration: 0.14, type: 'sine', gain: 0.1 },
  ],
  // Tick when a bid is locked in
  bidPlaced: [{ freq: 520, start: 0, duration: 0.07, type: 'square', gain: 0.06 }],
  // Three-note resolve at round end
  roundComplete: [
    { freq: 523, start: 0, duration: 0.13, type: 'sine', gain: 0.12 },
    { freq: 659, start: 0.12, duration: 0.13, type: 'sine', gain: 0.12 },
    { freq: 784, start: 0.24, duration: 0.22, type: 'sine', gain: 0.12 },
  ],
  // Triumphant arpeggio at game over
  gameOver: [
    { freq: 523, start: 0, duration: 0.15, type: 'triangle', gain: 0.14 },
    { freq: 659, start: 0.14, duration: 0.15, type: 'triangle', gain: 0.14 },
    { freq: 784, start: 0.28, duration: 0.15, type: 'triangle', gain: 0.14 },
    { freq: 1047, start: 0.42, duration: 0.3, type: 'triangle', gain: 0.14 },
  ],
  // Light pop when an emote arrives
  emote: [{ freq: 700, start: 0, duration: 0.09, type: 'sine', gain: 0.08 }],
}

export function playSound(name: SoundName) {
  playTones(SOUNDS[name])
}

export function isMuted(): boolean {
  return muted
}

export function toggleMute(): boolean {
  muted = !muted
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
  // Unlock the context on the same gesture if we're enabling sound
  if (!muted) getCtx()
  return muted
}

// One-time unlock so the first in-game sound isn't swallowed by autoplay policy
let unlockBound = false
export function bindAudioUnlock() {
  if (unlockBound || typeof window === 'undefined') return
  unlockBound = true
  const unlock = () => {
    getCtx()
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}
