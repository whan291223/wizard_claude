# Wizard Card Game — Project Notes

A mobile-first, real-time multiplayer implementation of the **Wizard** trick-taking
card game. Players join by nickname (no auth), share a room code, and play through
a series of bid-per-round tricks.

**Stack:** React 19 + TypeScript + Vite + Tailwind + Zustand (frontend) · FastAPI +
SQLModel + PostgreSQL + native WebSocket (backend).

---

## What was built

### Core game (backend `game_engine.py`, `deck.py`, `scoring.py`)
- 60-card deck: 52 standard + 4 Wizards (`W1`–`W4`) + 4 Jesters (`N1`–`N4`).
- Deal `round_number` cards per player, flip next card for trump.
- Bidding in seat order with the **last-bidder rule** (total bids may not equal the
  round number).
- Trick resolution: first Wizard wins; else highest trump; else highest card of led
  suit. Jesters lose to any real card; if a trick is all Jesters, the **first**
  Jester played wins.
- Follow-suit enforcement, with Wizards/Jesters always legal to play.
- Scoring: hit bid → `20 + 10×tricks`; miss → `-10 × |bid − tricks|`.

### Real-time layer
- WebSocket room manager (in-memory) with registered handlers: `start_game`,
  `submit_bid`, `play_card`, `emote`.
- On (re)connect the server re-sends `game_state` and, mid-game, `round_started`
  with current bids + trick so a client can fully restore state.

### Frontend gameplay UI
- Home (create/join) → Lobby → Game → Game Over flow.
- Responsive `Card` component using `vmax` + `clamp()` so cards scale up on portrait
  phones without ballooning on desktop.
- Wizard/Jester cards carry an **inherent suit** by number (`1=♣ 2=♦ 3=♥ 4=♠`);
  when flipped as trump, that suit is used. (`get_trump_suit()` is separate from
  `get_suit()`, which still returns `None` for specials so trick logic is untouched.)
- Inline bidding UI (hand stays visible) with +/- controls and forbidden-bid warning.
- `TrickArea` highlights the **current leading card** (yellow) in real time and the
  **confirmed winner** (green) during the 1.5s post-trick window.

### Features added in this session
- **Trump card image** shown in the top bar alongside the suit name.
- **Emotes:** 24 preset phrases across 3 swipeable pages (8 each), broadcast to all
  players and shown as a speech bubble above the sender in the PlayerStrip (auto-
  clears after 4s). Server validates against an allow-list.
- **Reconnect on reload:** identity persisted to localStorage via Zustand `persist`.
- **Sound effects:** Web Audio API synthesis (no asset files) for card play, trick
  win, your-turn, bid, round complete, game over, and emote — plus a persisted
  mute toggle.
- **Scoreboard history:** per-round score matrix (This round / History tabs) with a
  running-total footer.
- **Lobby:** native Share button (Web Share API) + Leave button.

---

## Key decisions

- **`get_trump_suit()` vs `get_suit()`** — kept separate so Wizards/Jesters can act as
  trump with a suit *without* affecting trick-following logic, which depends on
  `get_suit()` returning `None` for specials.
- **No dealer trump choice** — each Wizard/Jester has a fixed inherent suit by its
  number; flipping it as trump just uses that suit. Simpler than a dealer prompt.
- **Sound via Web Audio synthesis** — avoids shipping/licensing audio files; tones are
  composed in code. Context is unlocked on first user gesture (autoplay policy).
- **Persist identity only** — `persist` uses `partialize` to store just
  `playerId/nickname/roomCode`; transient game state is always re-sent by the server,
  so it's never persisted (avoids stale snapshots).
- **End-of-round sequencing** — the server sends `trick_complete` then immediately
  `round_complete`/`game_state`/`round_started`/`game_complete`. The client **buffers**
  the next-round messages (and game-over) during the 1.5s trick-winner highlight, then
  flushes them behind the round-result overlay. This guarantees the player always sees
  who won the last trick before the round/game summary appears.
- **Emote auto-clear via module-level timers** — survives re-renders and resets on
  repeat emotes from the same player.

---

## Known state / TODOs

- **Turn countdown timer (deferred):** a 5-second auto-submit countdown for bid/play
  turns is fully implemented but **commented out** in `Game.tsx` (search `TODO:
  re-enable countdown`). The `secs` state, badges, and tick effect are scaffolded;
  re-enable by restoring `COUNTDOWN_SECS` and the tick `useEffect`.
- **Round cap for testing:** `game_engine.py` hardcodes `self.total_rounds = 3`
  instead of `60 // max_players`. Two backend tests
  (`test_total_rounds_*`) intentionally fail because of this. Revert after testing.
- **Pre-existing lint warning:** `Hand.tsx:143` has an intentional empty-deps
  `useEffect` (global pointer listeners registered once, reading `dragRef` to stay
  fresh). The `react-hooks/exhaustive-deps` warning is expected — do not add `endDrag`
  to deps or listeners re-register every render.

### Possible future features
- Sound/emote polish, animations on card deal.
- Spectator mode / rejoin-by-URL.
- Persistent game history (DB-backed) and player stats.
- AI/bot players to fill seats.

---

## Verification commands

```bash
# Frontend (run in frontend/)
npm run build      # tsc -b && vite build
npm run lint
npm run dev

# Backend (run in backend/)
uv run pytest -q
uv run uvicorn app.main:app --reload
```

Current status: frontend build clean; backend `pytest` = 71 passed, 2 failed (the
intentional `total_rounds` cap tests).
