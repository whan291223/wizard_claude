import { useState } from 'react'
import Hand from '../Hand'
import Scoreboard from '../Scoreboard'
import Card from '../Card'
import WizardCard from '../WizardCard'
import { EMOTE_PAGES } from '../../utils/emotePhrases'
import { feltBg, ovalBg } from '../../theme/tableTheme'
import { SEAT_COLORS, COLOR_DOT } from '../../utils/cards'
import { getCurrentLeader } from '../../utils/trick'
import type { GameViewModel } from './viewModel'

// Mobile felt-table layout — matches Game Table Mobile.dc.html

const GTM_KEYFRAMES = `
@keyframes gtmTurnRing{0%,100%{box-shadow:0 0 0 2px rgba(95,227,154,.5),0 0 18px 3px rgba(95,227,154,.28)}50%{box-shadow:0 0 0 2px rgba(95,227,154,.9),0 0 30px 7px rgba(95,227,154,.5)}}
@keyframes gtmPlayable{0%,100%{box-shadow:0 0 0 1.5px rgba(125,255,176,.5),0 0 10px 2px rgba(95,227,154,.32)}50%{box-shadow:0 0 0 2px rgba(125,255,176,.95),0 0 18px 5px rgba(95,227,154,.58)}}
@keyframes gtmPilePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,236,170,0)}50%{box-shadow:0 0 24px 6px rgba(255,236,170,.4)}}
@keyframes gtmEmote{0%{transform:scale(.5);opacity:0}14%{transform:scale(1);opacity:1}80%{transform:scale(1);opacity:1}94%{transform:scale(1.1);opacity:0}100%{opacity:0}}
@keyframes gtmFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes gtmBubble{0%{transform:translateX(-50%) translateY(8px) scale(.85);opacity:0}55%{transform:translateX(-50%) translateY(0) scale(1.04);opacity:1}100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}}
@keyframes gtmSheet{0%{transform:translateY(100%)}100%{transform:translateY(0)}}
@keyframes gtmScrim{0%{opacity:0}100%{opacity:1}}
`

function ensureGtmKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById('gtm-keyframes')) return
  const st = document.createElement('style')
  st.id = 'gtm-keyframes'
  st.textContent = GTM_KEYFRAMES
  document.head.appendChild(st)
}
ensureGtmKeyframes()

const MEDALLION_MOBILE = `<svg viewBox="0 0 330 330" style="width:100%;height:100%;overflow:visible;">
  <g fill="none" stroke="#d8b24a">
    <circle cx="165" cy="165" r="156" stroke-opacity="0.13" stroke-width="1.6"/>
    <circle cx="165" cy="165" r="118" stroke-opacity="0.12" stroke-width="1.4" stroke-dasharray="2 11"/>
    <circle cx="165" cy="165" r="84" stroke-opacity="0.1" stroke-width="1.2"/>
  </g>
  <g opacity="0.5">
    <circle cx="165" cy="48" r="7" fill="#3fdd86"/><circle cx="282" cy="165" r="7" fill="#f4364a"/>
    <circle cx="165" cy="282" r="7" fill="#ff6ec2"/><circle cx="48" cy="165" r="7" fill="#5a96ff"/>
  </g>
  <g transform="translate(165,165)" fill="#d8b24a" fill-opacity="0.15" stroke="#d8b24a" stroke-opacity="0.26" stroke-width="1.4" stroke-linejoin="round">
    <polygon points="0,-66 15,-15 66,0 15,15 0,66 -15,15 -66,0 -15,-15"/>
  </g>
  <text x="165" y="184" text-anchor="middle" font-family="Cinzel, serif" font-weight="900" font-size="56" fill="#d8b24a" fill-opacity="0.28">W</text>
</svg>`

export default function StackedLayout({ vm }: { vm: GameViewModel }) {
  const {
    gameState, roundState, playerId, theme,
    myTurn, isBidding, isPlaying, myBidPending, playableCards,
    onPlayCard, onEmote, activeEmotes, roundHistory, muted, toggleMuted,
    suppressModals, trumpDisplay, trumpColor, dragActive, dragInZone, onDragChange,
  } = vm

  const [chatOpen, setChatOpen] = useState(false)
  const [chatPage, setChatPage] = useState(0)

  const myEmote = playerId ? activeEmotes[playerId] : undefined
  const myNickname = gameState.players.find((p) => p.id === playerId)?.nickname ?? 'You'
  const currentPlayerName = gameState.players.find((p) => p.seat_order === gameState.current_player_seat)?.nickname ?? '...'
  const myBid = playerId != null ? (roundState.bids[playerId] ?? null) : null
  const myWon = playerId != null ? (roundState.tricks_won[playerId] ?? 0) : 0

  // Opponents ordered clockwise from seat left of me
  const sorted = [...gameState.players].sort((a, b) => a.seat_order - b.seat_order)
  const count = sorted.length
  const mySeat = sorted.find((p) => p.id === playerId)?.seat_order ?? 0
  const opponents = sorted
    .filter((p) => p.id !== playerId)
    .map((p) => ({ p, ord: (p.seat_order - mySeat + count) % count }))
    .sort((a, b) => a.ord - b.ord)
    .map((x, i) => ({ ...x.p, seatColor: SEAT_COLORS[i % SEAT_COLORS.length] }))

  // Trick pile data
  const trick = roundState.current_trick
  const leaderId = getCurrentLeader(trick, gameState.trump_suit)
  const trickN = trick.length

  const showBidPanel = isBidding && myBidPending && myTurn && !suppressModals

  return (
    <div
      className="min-h-screen flex flex-col text-gray-100 select-none"
      style={{ backgroundColor: theme.base, backgroundImage: feltBg(theme), backgroundAttachment: 'fixed', fontFamily: "'Outfit',sans-serif" }}
    >

      {/* ── Top bar ── */}
      <div style={{ position: 'relative', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }} className="pt-safe">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999, background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600 }}>
          <span style={{ fontFamily: "'Cinzel',serif", color: '#7dffb0' }}>
            R{gameState.current_round}<span style={{ color: '#5f7f6c' }}>/{gameState.total_rounds}</span>
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#5f7f6c' }} />
          <span style={{ color: '#c7d8cd' }}>{count}P</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#5f7f6c' }} />
          <span style={{ color: trumpColor, fontWeight: 700 }}>{trumpDisplay}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Scoreboard
            players={gameState.players}
            tricksWon={roundState.tricks_won}
            bids={roundState.bids}
            roundHistory={roundHistory}
          />
          <button
            onClick={toggleMuted}
            aria-label={muted ? 'Unmute' : 'Mute'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.42)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 16 }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* ── Opponent strip ── */}
      <div style={{ position: 'relative', zIndex: 30, display: 'flex', gap: 9, padding: '4px 14px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {opponents.map((op) => {
          const dot = COLOR_DOT[op.seatColor]
          const isActive = op.seat_order === gameState.current_player_seat
          const emote = activeEmotes[op.id]
          return (
            <div key={op.id} style={{ position: 'relative', flex: '0 0 auto', width: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '9px 6px 8px', borderRadius: 14, background: isActive ? 'rgba(95,227,154,0.1)' : 'rgba(0,0,0,0.34)', border: `1px solid ${isActive ? 'rgba(125,255,176,0.4)' : 'rgba(255,255,255,0.07)'}`, transition: 'background .2s, border-color .2s' }}>
              {emote && (
                <div style={{ position: 'absolute', right: -4, top: -8, zIndex: 6, animation: 'gtmEmote 3.6s ease-in-out forwards', background: 'rgba(255,255,255,0.96)', padding: '5px 9px', borderRadius: 12, boxShadow: '0 4px 10px rgba(0,0,0,.4)', maxWidth: 'min(200px, calc(100vw - 30px))', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 14, fontWeight: 700, color: '#16261d', lineHeight: 1.3 }}>
                  {emote}
                </div>
              )}
              {/* Mini 2-card fan */}
              <div style={{ position: 'relative', width: 46, height: 62 }}>
                <div style={{ position: 'absolute', left: '50%', top: 2, transform: 'translateX(-58%) rotate(-7deg)', opacity: 0.85 }}>
                  <WizardCard variant="number" color={op.seatColor} rank="7" scale={0.5} faceDown interactive={false} />
                </div>
                <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-42%) rotate(7deg)' }}>
                  <WizardCard variant="number" color={op.seatColor} rank="7" scale={0.5} faceDown interactive={false} />
                </div>
                <div style={{ position: 'absolute', right: -6, bottom: -3, zIndex: 5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eaf3ec' }}>
                  {roundState.hand.length > 0 ? gameState.current_round - (roundState.tricks_won[op.id] ?? 0) : 0}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}` }} />
                <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', color: '#eaf3ec' }}>{op.nickname}</span>
              </div>
              <div style={{ fontSize: 9.5, color: '#a9c0b2', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                <span style={{ color: '#7dffb0', fontWeight: 600 }}>Bid {roundState.bids[op.id] ?? '–'}</span>
                {' · Won '}{roundState.tricks_won[op.id] ?? 0}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Center felt panel ── */}
      <div
        style={{
          position: 'relative', flex: 1, margin: '4px 14px', borderRadius: 26,
          background: ovalBg(theme), border: '1px solid rgba(0,0,0,0.3)',
          boxShadow: 'inset 0 4px 22px rgba(0,0,0,0.45), inset 0 -2px 8px rgba(120,200,160,0.1)',
          overflow: 'hidden', minHeight: 160,
          ...(dragActive && isPlaying ? { outline: dragInZone ? '2px solid rgba(95,227,154,0.8)' : '2px dashed rgba(150,150,150,0.5)' } : {}),
        }}
      >
        {/* Medallion */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 230, height: 230, pointerEvents: 'none', opacity: 0.85 }} dangerouslySetInnerHTML={{ __html: MEDALLION_MOBILE }} />

        {/* Trick pile */}
        {isPlaying && trick.length > 0 && (
          <div style={{ position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', width: 230, height: 150 }}>
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 90, height: 120, borderRadius: 13, animation: 'gtmPilePulse 2.4s ease-in-out infinite', pointerEvents: 'none' }} />
            {trick.map(({ player_id, card }, i) => {
              const t = i - (trickN - 1) / 2
              const x = (t * 40).toFixed(1)
              const y = ((i % 2 === 0 ? 8 : -6) - Math.abs(t) * 2).toFixed(1)
              const rot = (t * 6).toFixed(1)
              const isWinner = roundState.trick_winner_id === player_id
              const isLeading = !roundState.trick_winner_id && leaderId === player_id && trickN > 1
              const name = player_id === playerId ? 'You' : gameState.players.find((p) => p.id === player_id)?.nickname ?? '?'
              return (
                <div key={player_id} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rot}deg)`, zIndex: i + 1 }}>
                  <div style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,.5))', boxShadow: isWinner ? '0 0 0 3px #4ade80, 0 0 18px 4px rgba(74,222,128,0.5)' : isLeading ? '0 0 0 2px #facc15, 0 0 12px 2px rgba(250,204,21,0.4)' : 'none', borderRadius: 10, transition: 'box-shadow .3s' }}>
                    <Card card={card} size="sm" />
                  </div>
                  <div style={{ position: 'absolute', left: '50%', bottom: -13, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 600, color: player_id === playerId ? '#9dffce' : '#cfe0d5', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,.7)' }}>{name}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bid panel */}
        {showBidPanel && (
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 10, width: 228 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 18px', borderRadius: 20, background: 'rgba(7,15,11,0.66)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9fb8aa', fontWeight: 700 }}>Place your bid</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <button
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)', color: '#eaf3ec', fontSize: 23, cursor: vm.prevValid === null ? 'not-allowed' : 'pointer', opacity: vm.prevValid === null ? 0.3 : 1, fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={vm.prevValid === null}
                  onClick={() => vm.prevValid !== null && vm.setBid(vm.prevValid)}
                >−</button>
                <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 48, color: '#fff', minWidth: 60, textAlign: 'center' }}>{vm.bid}</div>
                <button
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(125,255,176,0.16)', border: '1px solid rgba(125,255,176,0.4)', color: '#9dffce', fontSize: 23, cursor: vm.nextValid === null ? 'not-allowed' : 'pointer', opacity: vm.nextValid === null ? 0.3 : 1, fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={vm.nextValid === null}
                  onClick={() => vm.nextValid !== null && vm.setBid(vm.nextValid)}
                >+</button>
              </div>
              {vm.forbiddenBid !== null && (
                <div style={{ fontSize: 10, color: '#ffd56b', textAlign: 'center' }}>Bid <strong>{vm.forbiddenBid}</strong> not allowed</div>
              )}
              <button
                onClick={vm.confirmBid}
                disabled={vm.bid === vm.forbiddenBid}
                style={{ marginTop: 2, padding: '9px 28px', borderRadius: 999, background: 'linear-gradient(180deg,#7dffb0,#3fb070)', border: 'none', color: '#06210f', fontWeight: 800, fontSize: 12.5, cursor: vm.bid === vm.forbiddenBid ? 'not-allowed' : 'pointer', opacity: vm.bid === vm.forbiddenBid ? 0.4 : 1, fontFamily: "'Outfit',sans-serif", boxShadow: '0 6px 14px rgba(95,227,154,0.32)' }}
              >Confirm bid</button>
            </div>
          </div>
        )}
        {isBidding && !showBidPanel && (
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: '#c7d8cd', fontSize: 13, textAlign: 'center' }}>
            Waiting for <strong style={{ color: '#eaf3ec' }}>{currentPlayerName}</strong> to bid…
          </div>
        )}

        {/* Trump card — bottom-left corner */}
        {gameState.trump_card && (
          <div style={{ position: 'absolute', left: 9, bottom: 9, zIndex: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'gtmFloat 5.5s ease-in-out infinite' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 3, padding: '3px 9px', borderRadius: 6, background: 'linear-gradient(180deg,#ffe9a8,#d8a93e 55%,#b07d22)', boxShadow: '0 3px 9px rgba(0,0,0,.45)' }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#5a3c0c"><path d="M5 16L3 5l5.5 4L12 4l3.5 5L21 5l-2 11z"/></svg>
              <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 800, fontSize: 9, letterSpacing: '0.16em', color: '#4a3208' }}>TRUMP</span>
            </div>
            <div style={{ position: 'relative', marginTop: 5 }}>
              <div style={{ position: 'absolute', inset: -12, borderRadius: 18, background: 'radial-gradient(circle, rgba(116,219,255,0.45) 0%, transparent 68%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', padding: 4, borderRadius: 11, background: 'linear-gradient(155deg,#fff0c2,#d8a93e 42%,#9c6c1c)', boxShadow: '0 8px 20px rgba(0,0,0,.5), 0 0 14px rgba(116,219,255,0.28)' }}>
                <div style={{ padding: 2, borderRadius: 8, background: 'linear-gradient(155deg,#2a1f0c,#150f06)' }}>
                  <Card card={gameState.trump_card} size="sm" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Turn + chat trigger row ── */}
      <div style={{ position: 'relative', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 14px 4px' }}>
        {isPlaying ? (
          myTurn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 999, background: 'rgba(95,227,154,0.14)', border: '1px solid rgba(125,255,176,0.4)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9dffce' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7dffb0', boxShadow: '0 0 7px #7dffb0' }} />Your turn to play
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 999, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10.5, fontWeight: 600, color: '#a9c0b2' }}>
              Waiting for <span style={{ color: '#eaf3ec', fontWeight: 700, marginLeft: 4, maxWidth: '6em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }}>{currentPlayerName}</span>&nbsp;to play
            </div>
          )
        ) : isBidding ? (
          (myTurn && myBidPending) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 999, background: 'rgba(95,227,154,0.14)', border: '1px solid rgba(125,255,176,0.4)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9dffce' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7dffb0', boxShadow: '0 0 7px #7dffb0' }} />Your turn to bid
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 999, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10.5, fontWeight: 600, color: '#a9c0b2' }}>
              Waiting for <span style={{ color: '#eaf3ec', fontWeight: 700, marginLeft: 4, maxWidth: '6em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }}>{currentPlayerName}</span>&nbsp;to bid
            </div>
          )
        ) : null}
        <button
          onClick={() => setChatOpen((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: chatOpen ? 'rgba(125,255,176,0.18)' : 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)', color: '#eaf3ec', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'background .15s' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7dffb0" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" strokeLinejoin="round"/></svg>
          Chat
        </button>
      </div>

      {/* ── My hand (arc fan) ── */}
      <div style={{ position: 'relative', zIndex: 20 }}>
        {/* My name label + bid/won */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#7dffb0', fontFamily: "'Cinzel',serif", letterSpacing: '0.06em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7dffb0', boxShadow: '0 0 6px #7dffb0' }} />
            {myNickname}
          </span>
          {(myBid !== null || isPlaying) && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: "'Outfit',sans-serif" }}>
              <span style={{ color: '#7dffb0' }}>Bid {myBid ?? '–'}</span>
              {' · Won '}{myWon}
            </span>
          )}
        </div>
        {myEmote && (
          <div style={{ position: 'absolute', left: '50%', bottom: '100%', marginBottom: 8, zIndex: 70, maxWidth: 300, animation: 'gtmBubble .32s cubic-bezier(.2,.9,.3,1.2) both', pointerEvents: 'none' }}>
            <div style={{ position: 'relative', background: '#fff', color: '#16261d', fontSize: 20, fontWeight: 700, lineHeight: 1.3, padding: '11px 17px', borderRadius: 16, boxShadow: '0 10px 24px rgba(0,0,0,.5)', textAlign: 'center', maxWidth: 'calc(100vw - 40px)', wordBreak: 'break-word' }}>
              {myEmote}
              <span style={{ position: 'absolute', left: '50%', bottom: -7, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '9px solid #fff' }} />
            </div>
          </div>
        )}
        <Hand
          cards={roundState.hand}
          onPlay={onPlayCard}
          myTurn={myTurn && isPlaying}
          playableCards={playableCards}
          onDragChange={onDragChange}
          fan
        />
      </div>

      {/* ── Bottom sheet scrim + quick chat ── */}
      {chatOpen && (
        <>
          <div
            onClick={() => setChatOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.5)', animation: 'gtmScrim .2s ease-out both' }}
          />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 81, background: 'rgba(13,20,15,0.98)', borderRadius: '26px 26px 0 0', borderTop: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 -16px 40px rgba(0,0,0,0.5)', padding: '10px 16px 32px', animation: 'gtmSheet .26s cubic-bezier(.2,.8,.25,1) both' }}>
            <div style={{ width: 40, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.25)', margin: '2px auto 12px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9fb8aa', fontWeight: 700 }}>Quick Chat</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <button
                  onClick={() => setChatPage((p) => (p + EMOTE_PAGES.length - 1) % EMOTE_PAGES.length)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#cdded4', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >‹</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {EMOTE_PAGES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setChatPage(i)}
                      style={{ border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', width: i === chatPage ? 7 : 6, height: i === chatPage ? 7 : 6, background: i === chatPage ? '#7dffb0' : 'rgba(255,255,255,0.25)' }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setChatPage((p) => (p + 1) % EMOTE_PAGES.length)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#cdded4', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >›</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {EMOTE_PAGES[chatPage].map((text) => (
                <button
                  key={text}
                  onClick={() => { onEmote(text); setChatOpen(false) }}
                  style={{ textAlign: 'left', padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', color: '#eaf3ec', fontSize: 12.5, fontWeight: 500, lineHeight: 1.25, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
