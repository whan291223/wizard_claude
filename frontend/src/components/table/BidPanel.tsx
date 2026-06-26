import type { CSSProperties } from 'react'
import type { GameViewModel } from './viewModel'

// Glassy bid panel ported from Game Table.dc.html, wired to the live bid state.
// Used by both the oval-table and stacked layouts.

const ACCENT = '#7dffb0'

export default function BidPanel({ vm }: { vm: GameViewModel }) {
  const { bid, setBid, nextValid, prevValid, forbiddenBid, confirmBid, pastBids, gameState, secs } = vm
  const round = gameState.current_round

  const minusStyle: CSSProperties = {
    width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.16)', color: '#eaf3ec', fontSize: 26, lineHeight: 1,
    cursor: prevValid === null ? 'not-allowed' : 'pointer', opacity: prevValid === null ? 0.3 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif",
  }
  const plusStyle: CSSProperties = {
    width: 46, height: 46, borderRadius: '50%', background: 'rgba(125,255,176,0.16)',
    border: '1px solid rgba(125,255,176,0.4)', color: '#9dffce', fontSize: 26, lineHeight: 1,
    cursor: nextValid === null ? 'not-allowed' : 'pointer', opacity: nextValid === null ? 0.3 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif",
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        padding: '24px 30px', borderRadius: 24, background: 'rgba(7,15,11,0.72)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 22px 54px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        fontFamily: "'Outfit',sans-serif", color: '#eaf3ec', maxWidth: 340,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#9fb8aa', fontWeight: 700 }}>
        Place your bid
      </div>
      <div style={{ fontSize: 12, color: '#a9c0b2', marginTop: -6 }}>Round {round} · how many tricks will you win?</div>

      {pastBids.length > 0 && (
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {pastBids.map(({ nickname, bid: b }) => (
            <span key={nickname} style={{ fontSize: 11, color: '#cfe0d5', background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '3px 9px' }}>
              {nickname} <span style={{ color: ACCENT, fontWeight: 700 }}>{b}</span>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <button style={minusStyle} disabled={prevValid === null} onClick={() => prevValid !== null && setBid(prevValid)}>−</button>
        <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 56, lineHeight: 1, color: '#fff', minWidth: 70, textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {bid}
        </div>
        <button style={plusStyle} disabled={nextValid === null} onClick={() => nextValid !== null && setBid(nextValid)}>+</button>
      </div>

      {forbiddenBid !== null && (
        <div style={{ fontSize: 11, color: '#ffd56b', textAlign: 'center', maxWidth: 260 }}>
          Bid <strong>{forbiddenBid}</strong> not allowed — total bids can't equal {round}
        </div>
      )}

      <button
        onClick={confirmBid}
        disabled={bid === forbiddenBid}
        style={{
          marginTop: 2, padding: '9px 30px', borderRadius: 999,
          background: 'linear-gradient(180deg,#7dffb0,#3fb070)', border: 'none', color: '#06210f',
          fontWeight: 800, fontSize: 13, letterSpacing: '0.04em',
          cursor: bid === forbiddenBid ? 'not-allowed' : 'pointer', opacity: bid === forbiddenBid ? 0.4 : 1,
          fontFamily: "'Outfit',sans-serif", boxShadow: '0 6px 16px rgba(95,227,154,0.35)',
        }}
      >
        Confirm bid: {bid}{secs !== null ? ` (${secs}s)` : ''}
      </button>
    </div>
  )
}
