import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { PlayerInfo } from '../types/game'
import type { RoundResult } from '../store/gameStore'
import { COLOR_DOT, SEAT_COLORS } from '../utils/cards'
import type { WizardColor } from './WizardCard'

interface ScoreboardProps {
  players: PlayerInfo[]
  tricksWon: Record<string, number>
  bids: Record<string, number | null>
  roundHistory?: RoundResult[]
}

export default function Scoreboard({ players, tricksWon, bids, roundHistory = [] }: ScoreboardProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'current' | 'history'>('current')

  // Sort by seat_order for stable column order
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order)

  const playerColor = (pid: string): string => {
    const idx = sorted.findIndex(p => p.id === pid)
    const name: WizardColor = SEAT_COLORS[idx % SEAT_COLORS.length]
    return COLOR_DOT[name]
  }

  const dealerColor = (dealerSeat?: number): string => {
    if (dealerSeat == null) return '#ffffff'
    const p = players.find(q => q.seat_order === dealerSeat)
    return p ? playerColor(p.id) : '#ffffff'
  }

  const dealerPlayerId = (dealerSeat?: number): string | null => {
    if (dealerSeat == null) return null
    return players.find(q => q.seat_order === dealerSeat)?.id ?? null
  }

  const shortName = (n: string) => n.length > 6 ? n.slice(0, 5) + '…' : n

  const handleOpen = () => {
    setTab(roundHistory.length > 0 ? 'history' : 'current')
    setOpen(true)
  }

  const panelStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, rgba(12,28,18,0.97) 0%, rgba(5,20,12,0.99) 100%)',
    border: '1px solid rgba(63,221,134,0.18)',
    borderRadius: 20,
    padding: '20px 18px 16px',
    width: '100%',
    maxWidth: 360,
    boxShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(63,221,134,0.12)',
    fontFamily: "'Cinzel', serif",
  }

  const tabActive: React.CSSProperties = {
    background: 'rgba(63,221,134,0.15)',
    color: '#7dffb0',
    borderRadius: 8,
    border: '1px solid rgba(63,221,134,0.3)',
  }
  const tabInactive: React.CSSProperties = {
    background: 'transparent',
    color: 'rgba(255,255,255,0.45)',
    borderRadius: 8,
    border: '1px solid transparent',
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          letterSpacing: '0.05em',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#7dffb0')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
      >
        Scores
      </button>

      {open && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: 16,
          }}
          onClick={() => setOpen(false)}
        >
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: '#7dffb0',
              textAlign: 'center', letterSpacing: '0.12em',
              marginBottom: 14, textTransform: 'uppercase',
            }}>
              Scoreboard
            </h2>

            {/* Tabs */}
            <div style={{
              display: 'flex', gap: 6, marginBottom: 14,
              background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4,
            }}>
              {(['current', 'history'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '6px 0', fontSize: 11,
                    fontFamily: "'Cinzel', serif", fontWeight: 600,
                    letterSpacing: '0.06em', cursor: 'pointer',
                    textTransform: 'uppercase', transition: 'all 0.15s',
                    ...(tab === t ? tabActive : tabInactive),
                  }}
                >
                  {t === 'current' ? 'This Round' : 'History'}
                </button>
              ))}
            </div>

            {tab === 'current' ? (
              /* ── Current round ── */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {(['Player', 'Bid', 'Tricks', 'Total'] as const).map((h, i) => (
                      <th key={h} style={{
                        textAlign: i === 0 ? 'left' : 'right',
                        color: 'rgba(255,255,255,0.4)', fontSize: 10,
                        letterSpacing: '0.08em', paddingBottom: 8,
                        fontFamily: "'Cinzel', serif", textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <td style={{ padding: '8px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: playerColor(p.id), flexShrink: 0,
                          boxShadow: `0 0 6px ${playerColor(p.id)}99`,
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                          {p.nickname}
                        </span>
                      </td>
                      <td style={{ padding: '8px 0 8px 4px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                        {bids[p.id] ?? '—'}
                      </td>
                      <td style={{ padding: '8px 0 8px 4px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                        {tricksWon[p.id] ?? 0}
                      </td>
                      <td style={{ padding: '8px 0 8px 4px', textAlign: 'right', fontWeight: 700, color: '#c4b5fd' }}>
                        {p.total_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : roundHistory.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>
                No rounds completed yet.
              </p>
            ) : (
              /* ── History table ── */
              <div style={{ overflowX: 'auto', margin: '0 -4px', padding: '0 4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 200 }}>
                  <thead>
                    <tr>
                      <th style={{
                        textAlign: 'left', paddingBottom: 8, paddingRight: 8,
                        color: 'rgba(255,255,255,0.4)', fontSize: 10,
                        letterSpacing: '0.08em', fontFamily: "'Cinzel', serif", textTransform: 'uppercase',
                      }}>R</th>
                      {sorted.map(p => (
                        <th key={p.id} style={{
                          textAlign: 'right', paddingBottom: 8, paddingLeft: 4,
                          fontFamily: "'Cinzel', serif",
                        }}>
                          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: playerColor(p.id),
                              boxShadow: `0 0 5px ${playerColor(p.id)}aa`,
                              alignSelf: 'flex-end',
                            }} />
                            <span style={{
                              color: playerColor(p.id), fontSize: 10,
                              letterSpacing: '0.04em', textTransform: 'none',
                              fontWeight: 600,
                            }}>
                              {shortName(p.nickname)}
                            </span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roundHistory.map(r => {
                      const dealerId = dealerPlayerId(r.dealer_seat)
                      const dc = dealerColor(r.dealer_seat)
                      return (
                        <tr key={r.round_number} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <td style={{ padding: '7px 8px 7px 0', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                            <span style={{ marginRight: 4 }}>{r.round_number}</span>
                            {dealerId && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 14, height: 14, borderRadius: 3,
                                background: `${dc}22`, border: `1px solid ${dc}55`,
                                color: dc, fontSize: 8, fontWeight: 700, letterSpacing: 0,
                                verticalAlign: 'middle',
                              }}>D</span>
                            )}
                          </td>
                          {sorted.map(p => {
                            const delta = r.scores[p.id] ?? 0
                            const isDealer = p.id === dealerId
                            const pc = playerColor(p.id)
                            return (
                              <td key={p.id} style={{
                                padding: '7px 0 7px 4px', textAlign: 'right',
                                fontWeight: isDealer ? 700 : 500,
                                color: delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : 'rgba(255,255,255,0.4)',
                                background: isDealer ? `${pc}14` : 'transparent',
                                borderRadius: isDealer ? 4 : 0,
                                boxShadow: isDealer ? `inset 0 0 0 1px ${pc}30` : 'none',
                              }}>
                                {delta > 0 ? '+' : ''}{delta}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                    {/* Cumulative totals */}
                    <tr style={{ borderTop: '2px solid rgba(255,255,255,0.15)' }}>
                      <td style={{ padding: '8px 8px 4px 0', color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: '0.05em' }}>Σ</td>
                      {sorted.map(p => {
                        const last = roundHistory[roundHistory.length - 1]
                        const total = last?.cumulative[p.id] ?? 0
                        return (
                          <td key={p.id} style={{
                            padding: '8px 0 4px 4px', textAlign: 'right',
                            fontWeight: 700, color: '#c4b5fd', fontSize: 13,
                          }}>
                            {total}
                          </td>
                        )
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              style={{
                width: '100%', marginTop: 14, padding: '8px 0',
                color: 'rgba(255,255,255,0.4)', background: 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 12,
                fontFamily: "'Cinzel', serif", letterSpacing: '0.06em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7dffb0')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
