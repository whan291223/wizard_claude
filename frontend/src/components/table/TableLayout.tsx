import { useState, type CSSProperties } from 'react'
import Hand from '../Hand'
import Scoreboard from '../Scoreboard'
import OpponentSeat from './OpponentSeat'
import CenterPile from './CenterPile'
import TrumpHolder from './TrumpHolder'
import BidPanel from './BidPanel'
import QuickChat from './QuickChat'
import { useFitScale } from '../../hooks/useFitScale'
import { feltBg, ovalBg } from '../../theme/tableTheme'
import { SEAT_COLORS } from '../../utils/cards'
import type { GameViewModel } from './viewModel'

const DESIGN_W = 1280
const DESIGN_H = 820

const KEYFRAMES = `
@keyframes gtTurnRing{0%,100%{box-shadow:0 0 0 2px rgba(95,227,154,.55),0 0 26px 4px rgba(95,227,154,.30)}50%{box-shadow:0 0 0 2px rgba(95,227,154,.9),0 0 46px 10px rgba(95,227,154,.5)}}
@keyframes gtPilePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,236,170,0)}50%{box-shadow:0 0 34px 8px rgba(255,236,170,.45)}}
@keyframes gtEmote{0%{transform:translateX(-50%) scale(.5);opacity:0}12%{transform:translateX(-50%) scale(1);opacity:1}78%{transform:translateX(-50%) scale(1);opacity:1}92%{transform:translateX(-50%) scale(1.12);opacity:0}100%{opacity:0}}
@keyframes gtFloatBadge{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes gtBubblePop{0%{transform:translateX(-50%) translateY(8px) scale(.85);opacity:0}55%{transform:translateX(-50%) translateY(0) scale(1.04);opacity:1}100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}}
@keyframes gtPanelUp{0%{transform:translateY(12px);opacity:0}100%{transform:translateY(0);opacity:1}}
`

function ensureKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById('game-table-keyframes')) return
  const st = document.createElement('style')
  st.id = 'game-table-keyframes'
  st.textContent = KEYFRAMES
  document.head.appendChild(st)
}
ensureKeyframes()

const MEDALLION = `<svg viewBox="0 0 330 330" style="width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 14px rgba(216,178,74,0.12))">
  <g fill="none" stroke="#d8b24a">
    <circle cx="165" cy="165" r="158" stroke-opacity="0.14" stroke-width="1.4"/>
    <circle cx="165" cy="165" r="150" stroke-opacity="0.10" stroke-width="1"/>
    <circle cx="165" cy="165" r="120" stroke-opacity="0.13" stroke-width="1.2" stroke-dasharray="2 10"/>
    <circle cx="165" cy="165" r="88" stroke-opacity="0.10" stroke-width="1"/>
  </g>
  <g opacity="0.5">
    <circle cx="165" cy="45" r="6" fill="#3fdd86"/><circle cx="285" cy="165" r="6" fill="#f4364a"/>
    <circle cx="165" cy="285" r="6" fill="#ff6ec2"/><circle cx="45" cy="165" r="6" fill="#5a96ff"/>
  </g>
  <g transform="translate(165,165)" fill="#d8b24a" fill-opacity="0.16" stroke="#d8b24a" stroke-opacity="0.28" stroke-width="1.2" stroke-linejoin="round">
    <polygon points="0,-70 16,-16 70,0 16,16 0,70 -16,16 -70,0 -16,-16"/>
  </g>
  <text x="165" y="182" text-anchor="middle" font-family="Cinzel, serif" font-weight="900" font-size="58" fill="#d8b24a" fill-opacity="0.30">W</text>
</svg>`

const SLOT_POS: Record<string, CSSProperties> = {
  L:  { left: 16, top: 232, width: 196 },
  TL: { left: 200, top: 66, width: 220 },
  TC: { left: '50%', top: 60, transform: 'translateX(-50%)', width: 220 },
  TR: { right: 200, top: 66, width: 220 },
  R:  { right: 16, top: 232, width: 196 },
}
const LAYOUTS: Record<number, string[]> = {
  3: ['TL', 'TR'],
  4: ['TL', 'TC', 'TR'],
  5: ['L', 'TL', 'TR', 'R'],
  6: ['L', 'TL', 'TC', 'TR', 'R'],
}

export default function TableLayout({ vm }: { vm: GameViewModel }) {
  const {
    gameState, roundState, playerId, theme,
    myTurn, isBidding, isPlaying, myBidPending, playableCards,
    onPlayCard, onEmote, activeEmotes, roundHistory, muted, toggleMuted,
    suppressModals, trumpDisplay, trumpColor,
  } = vm

  const [fitRef, scale] = useFitScale(DESIGN_W, DESIGN_H)
  const [chatOpen, setChatOpen] = useState(false)

  // Opponents ordered clockwise starting from the seat left of me, mapped to table slots.
  const sorted = [...gameState.players].sort((a, b) => a.seat_order - b.seat_order)
  const count = sorted.length
  const mySeat = sorted.find((p) => p.id === playerId)?.seat_order ?? 0
  const opponents = sorted
    .filter((p) => p.id !== playerId)
    .map((p) => ({ p, ord: (p.seat_order - mySeat + count) % count }))
    .sort((a, b) => a.ord - b.ord)
    .map((x) => x.p)
  const slots = LAYOUTS[count] ?? LAYOUTS[Math.min(6, Math.max(3, count))] ?? []
  const fanCount = Math.max(1, Math.min(gameState.current_round, 6))

  const myEmote = playerId ? activeEmotes[playerId] : undefined
  const myNickname = gameState.players.find((p) => p.id === playerId)?.nickname ?? 'You'
  const currentPlayerName = gameState.players.find((p) => p.seat_order === gameState.current_player_seat)?.nickname ?? '...'
  const myBid = playerId != null ? (roundState.bids[playerId] ?? null) : null
  const myWon = playerId != null ? (roundState.tricks_won[playerId] ?? 0) : 0
  const showBidPanel = isBidding && myBidPending && myTurn && !suppressModals

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', backgroundColor: theme.base, backgroundImage: feltBg(theme), fontFamily: "'Outfit',sans-serif", color: '#eaf3ec' }}>
      {/* ── Scaled visual artboard (1280×820) ── */}
      <div ref={fitRef} style={{ position: 'absolute', inset: 0 }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: DESIGN_W, height: DESIGN_H, transform: `translate(-50%,-50%) scale(${scale})`, transformOrigin: 'center center' }}>
          {/* Oval table */}
          <div style={{ position: 'absolute', left: '50%', top: 300, transform: 'translateX(-50%)', width: 680, height: 330, borderRadius: '50% / 32%', background: ovalBg(theme), border: '6px solid rgba(0,0,0,0.34)', boxShadow: 'inset 0 6px 34px rgba(0,0,0,0.5), inset 0 -2px 10px rgba(110,200,170,0.12), 0 18px 50px rgba(0,0,0,0.5)' }} />
          {/* Medallion */}
          <div style={{ position: 'absolute', left: '50%', top: 465, transform: 'translate(-50%,-50%)', width: 330, height: 330, pointerEvents: 'none', zIndex: 1, opacity: 0.9 }} dangerouslySetInnerHTML={{ __html: MEDALLION }} />
          {/* Dashed inner ellipse */}
          <div style={{ position: 'absolute', left: '50%', top: 316, transform: 'translateX(-50%)', width: 600, height: 280, borderRadius: '50% / 32%', border: '1.5px dashed rgba(150,220,175,0.16)', pointerEvents: 'none', zIndex: 1 }} />

          {/* Round / player badge */}
          <div style={{ position: 'absolute', left: 20, top: 18, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 15px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', fontSize: 12.5, fontWeight: 600, border: '1px solid rgba(255,255,255,0.08)', animation: 'gtFloatBadge 5s ease-in-out infinite', zIndex: 40 }}>
            <span style={{ fontFamily: "'Cinzel',serif", color: '#7dffb0' }}>Round {gameState.current_round} <span style={{ color: '#5f7f6c' }}>/ {gameState.total_rounds}</span></span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#5f7f6c' }} />
            <span style={{ color: '#c7d8cd' }}>{count} players</span>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#5f7f6c' }} />
            <span style={{ color: '#c7d8cd' }}>Trump: <span style={{ color: trumpColor, fontWeight: 700 }}>{trumpDisplay}</span></span>
          </div>

          {/* Scoreboard (top-right) + mute (bottom-right) */}
          <div style={{ position: 'absolute', right: 20, top: 18, zIndex: 40, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Scoreboard players={gameState.players} tricksWon={roundState.tricks_won} bids={roundState.bids} roundHistory={roundHistory} />
          </div>
          <button onClick={toggleMuted} aria-label={muted ? 'Unmute' : 'Mute'} style={{ position: 'absolute', right: 20, bottom: 18, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', zIndex: 40, fontSize: 17 }}>
            {muted ? '🔇' : '🔊'}
          </button>

          {/* Opponent seats */}
          {opponents.map((p, i) => {
            const slot = slots[i]
            if (!slot) return null
            const side = slot === 'L' || slot === 'R'
            return (
              <div key={p.id} style={{ position: 'absolute', zIndex: 20, ...SLOT_POS[slot] }}>
                <OpponentSeat
                  name={p.id === playerId ? 'You' : p.nickname}
                  color={SEAT_COLORS[i % SEAT_COLORS.length]}
                  bid={roundState.bids[p.id] ?? null}
                  won={roundState.tricks_won[p.id] ?? 0}
                  fanCount={fanCount}
                  emote={activeEmotes[p.id]}
                  active={p.seat_order === gameState.current_player_seat}
                  side={side}
                />
              </div>
            )
          })}

          {/* Trump holder */}
          {gameState.trump_card && (
            <div style={{ position: 'absolute', left: 60, top: 402, zIndex: 9 }}>
              <TrumpHolder card={gameState.trump_card} />
            </div>
          )}

          {/* Center trick pile */}
          {isPlaying && (
            <div style={{ position: 'absolute', left: '50%', top: 465, transform: 'translate(-50%,-50%)', zIndex: 6 }}>
              <CenterPile
                trick={roundState.current_trick}
                players={gameState.players}
                playerId={playerId}
                trumpSuit={gameState.trump_suit}
                trickWinnerId={roundState.trick_winner_id}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Unscaled interactive overlays ── */}

      {/* Bid panel (centered) */}
      {showBidPanel && (
        <div style={{ position: 'fixed', left: '50%', top: '46%', transform: 'translate(-50%,-50%)', zIndex: 50 }}>
          <BidPanel vm={vm} />
        </div>
      )}
      {isBidding && !showBidPanel && (
        <div style={{ position: 'fixed', left: '50%', top: '44%', transform: 'translate(-50%,-50%)', zIndex: 50, color: '#c7d8cd', fontSize: 14, textAlign: 'center' }}>
          Waiting for <strong style={{ color: '#eaf3ec' }}>{currentPlayerName}</strong> to bid…
        </div>
      )}

      {/* Bottom zone: bubble · turn label · chat trigger · hand */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', zIndex: 55 }}>
        {/* My speech bubble */}
        {myEmote && (
          <div style={{ marginBottom: 10, pointerEvents: 'none', animation: 'gtBubblePop .32s cubic-bezier(.2,.9,.3,1.2) both' }}>
            <div style={{ position: 'relative', background: '#fff', color: '#16261d', fontSize: 22, fontWeight: 700, lineHeight: 1.3, padding: '13px 20px', borderRadius: 18, boxShadow: '0 10px 26px rgba(0,0,0,.5)', textAlign: 'center', maxWidth: 'min(420px, calc(100vw - 40px))', wordBreak: 'break-word' }}>
              {myEmote}
              <span style={{ position: 'absolute', left: '50%', bottom: -8, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '10px solid #fff' }} />
            </div>
          </div>
        )}

        {/* Quick chat panel */}
        {chatOpen && (
          <div style={{ marginBottom: 10, pointerEvents: 'auto', animation: 'gtPanelUp .22s ease-out both' }}>
            <QuickChat onSend={onEmote} onClose={() => setChatOpen(false)} />
          </div>
        )}

        {/* My name badge + bid/won */}
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#7dffb0', fontFamily: "'Cinzel',serif", letterSpacing: '0.06em' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7dffb0', boxShadow: '0 0 6px #7dffb0' }} />
            {myNickname}
          </span>
          {(myBid !== null || isPlaying) && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: "'Outfit',sans-serif", letterSpacing: 0 }}>
              <span style={{ color: '#7dffb0' }}>Bid {myBid ?? '–'}</span>
              {' · Won '}{myWon}
            </span>
          )}
        </div>

        {/* Turn / bid status label */}
        {isPlaying ? (
          myTurn ? (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7, padding: '4px 14px', borderRadius: 999, background: 'rgba(95,227,154,0.14)', border: '1px solid rgba(125,255,176,0.4)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9dffce' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7dffb0', boxShadow: '0 0 8px #7dffb0' }} />Your turn to play
            </div>
          ) : (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11.5, fontWeight: 600, color: '#a9c0b2' }}>
              Waiting for <span style={{ color: '#eaf3ec', fontWeight: 700, marginLeft: 4, maxWidth: '7em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }}>{currentPlayerName}</span>&nbsp;to play
            </div>
          )
        ) : isBidding ? (
          (myTurn && myBidPending) ? (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 7, padding: '4px 14px', borderRadius: 999, background: 'rgba(95,227,154,0.14)', border: '1px solid rgba(125,255,176,0.4)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9dffce' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7dffb0', boxShadow: '0 0 8px #7dffb0' }} />Your turn to bid
            </div>
          ) : (
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11.5, fontWeight: 600, color: '#a9c0b2' }}>
              Waiting for <span style={{ color: '#eaf3ec', fontWeight: 700, marginLeft: 4, maxWidth: '7em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }}>{currentPlayerName}</span>&nbsp;to bid
            </div>
          )
        ) : null}

        {/* Chat trigger */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          style={{ marginBottom: 8, pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: chatOpen ? 'rgba(125,255,176,0.18)' : 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)', color: '#eaf3ec', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7dffb0" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" strokeLinejoin="round" /></svg>
          Say something
        </button>

        {/* Hand (full interactive, unscaled) */}
        <div style={{ pointerEvents: 'auto', width: '100%' }}>
          <Hand
            cards={roundState.hand}
            onPlay={onPlayCard}
            myTurn={myTurn && isPlaying}
            playableCards={playableCards}
            onDragChange={vm.onDragChange}
            transparent
            fade={!isBidding}
          />
        </div>
      </div>
    </div>
  )
}
