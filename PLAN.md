# Wizard Card Game — Implementation Plan

## Context
Build a mobile-friendly web implementation of the Wizard trick-taking card game (60-card deck, Wizards/Jesters, 3–6 players, bid-per-round scoring). First version is web-only (no Line integration). Players join by nickname — no auth. Real-time multiplayer via WebSocket.

---

## Tech Stack
| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite (pnpm) |
| Styling | Tailwind CSS (mobile-first) |
| State | Zustand |
| Real-time | native WebSocket (browser) |
| Backend | FastAPI (Python 3.11+) |
| ORM | SQLModel (built on SQLAlchemy + Pydantic — one class per table) |
| Migrations | Alembic |
| DB | PostgreSQL |
| WS server | FastAPI WebSocket + in-memory room manager |
| Python runner | uv (`uv run uvicorn app.main:app --reload`) |

---

## Project Structure

```
wizard_claude/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── database.py          # async engine + session
│   │   ├── core/config.py       # settings via env vars
│   │   ├── models/              # SQLModel models
│   │   │   ├── game.py
│   │   │   ├── player.py
│   │   │   └── round.py
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── games.py         # REST: create/get game
│   │   │   └── ws.py            # WebSocket endpoint
│   │   └── services/
│   │       ├── game_engine.py   # core game rules (pure logic)
│   │       ├── deck.py          # deck creation & shuffling
│   │       ├── scoring.py       # score calculation
│   │       └── room_manager.py  # in-memory WS connection map
│   ├── alembic/
│   ├── alembic.ini
│   ├── pyproject.toml           # uv project config
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── types/game.ts        # shared TS types
    │   ├── store/gameStore.ts   # Zustand store
    │   ├── hooks/useGameWS.ts   # WebSocket hook
    │   ├── components/
    │   │   ├── Card.tsx
    │   │   ├── Hand.tsx
    │   │   ├── TrickArea.tsx
    │   │   ├── BidModal.tsx
    │   │   ├── Scoreboard.tsx
    │   │   └── TrumpChooser.tsx
    │   ├── pages/
    │   │   ├── Home.tsx         # create / join game
    │   │   ├── Lobby.tsx        # waiting room
    │   │   └── Game.tsx         # main game table
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Database Models

### `games`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| room_code | VARCHAR(6) | unique, human-readable |
| status | ENUM | waiting / in_progress / finished |
| num_players | INT | 3–6 |
| current_round | INT | 1-based |
| current_phase | ENUM | dealing / bidding / playing / scoring |
| dealer_seat | INT | rotates each round |
| trump_suit | VARCHAR | clubs/diamonds/hearts/spades/none/pending |
| created_at | TIMESTAMP | |

### `players`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| game_id | UUID FK → games | |
| nickname | VARCHAR | |
| seat_order | INT | 0-based, fixed at join |
| is_host | BOOLEAN | first joiner |
| total_score | INT | cumulative |

### `rounds`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| game_id | UUID FK | |
| round_number | INT | |
| trump_card | VARCHAR | serialized card that was flipped |
| bids | JSONB | {player_id: bid_amount} |
| tricks_won | JSONB | {player_id: count} |
| scores | JSONB | {player_id: round_score} |

### `tricks` (optional for v1 — can derive from WS events)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| round_id | UUID FK | |
| trick_number | INT | |
| cards_played | JSONB | [{player_id, card}] in play order |
| winner_player_id | UUID FK | |

---

## Card Representation
Cards stored/transmitted as strings:
- Regular: `"H7"`, `"SA"`, `"DK"`, `"C3"` (suit + rank)
- Wizards: `"W1"`, `"W2"`, `"W3"`, `"W4"`
- Jesters: `"J1"`, `"J2"`, `"J3"`, `"J4"`

Deck = 60 cards total. Suit order for trump comparison: none < C < D < H < S.

---

## Game Engine Rules (`services/game_engine.py`)

**Deal:** Shuffle 60 cards. Deal `round_number` cards to each player. Flip next card for trump.
- Flipped card is Wizard → `trump_suit = "pending"` (dealer chooses), event `choose_trump` sent
- Flipped card is Jester → `trump_suit = "none"`
- Otherwise → trump = flipped card's suit

**Bidding:** Each player bids in seat order starting after dealer. No restriction on sum of bids.

**Trick-taking:**
- Lead player plays any card
- Others must follow led suit if possible (Wizards/Jesters exempt — can always be played)
- Trick winner: first Wizard played wins; else highest trump; else highest card of led suit
- Jester always loses (never wins unless all Jesters played)

**Scoring (per round):**
- Correct bid: `+20 + (10 × tricks_won)`
- Wrong bid: `−10 × |bid − tricks_won|`

**Round count:** `floor(60 / num_players)` rounds total.

---

## WebSocket Protocol

**Client → Server** (JSON `{type, payload}`)
| Event | Payload |
|---|---|
| `join_game` | `{room_code, nickname}` |
| `start_game` | `{}` |
| `submit_bid` | `{bid: int}` |
| `play_card` | `{card: string}` |
| `choose_trump` | `{suit: string}` |

**Server → Client** (broadcast or targeted)
| Event | Notes |
|---|---|
| `game_state` | Full state snapshot (sent on join + after each phase change) |
| `player_joined` | Another player joined |
| `game_started` | |
| `round_started` | Includes each player's hand (private — per-player send) |
| `bid_submitted` | `{player_id, bid}` — broadcast (amount hidden until all bid) |
| `all_bids_in` | Reveals all bids |
| `card_played` | `{player_id, card}` |
| `trick_complete` | `{winner_id, cards}` |
| `round_complete` | `{scores, cumulative_scores}` |
| `trump_needed` | Dealer must choose trump suit |
| `game_complete` | `{final_scores}` |
| `error` | `{message}` |

**Room manager** (`services/room_manager.py`): in-memory dict mapping `room_code → {player_id → WebSocket}`. No Redis for v1.

---

## REST API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/games` | Create game, returns `{room_code, game_id}` |
| GET | `/api/games/{room_code}` | Get public game state (for reconnect) |
| WS | `/ws/{room_code}/{player_id}` | WebSocket connection |

---

## Frontend Pages & Flow

```
Home → enter nickname + [Create Game] or [Join Game by code]
  ↓
Lobby → show players list, room code, [Start Game] (host only)
  ↓
Game → round info, hand, trick area, bids, scoreboard
  ↓ (after last round)
Game Over → final scores + [Play Again]
```

**Game page layout (mobile):**
- Top bar: round info, trump suit, scores toggle
- Center: trick area (cards played by each player)
- Bottom: player's hand (scrollable row of cards)
- Bid modal: overlay when bidding phase

---

## Implementation Phases

### Phase 1 — Project Scaffolding
- `backend/`: FastAPI skeleton, SQLModel setup, Alembic init, PostgreSQL connection, `pyproject.toml` for uv
- `frontend/`: Vite + React + TS + Tailwind init, React Router, Zustand
- `.env.example` for DB URL and settings

### Phase 2 — Game Engine (pure logic, no DB)
- `deck.py`: build 60-card deck, shuffle
- `game_engine.py`: deal, bid tracking, play card + trick resolution, scoring
- Unit tests for engine (pytest)

### Phase 3 — DB Models + Migrations
- Define SQLModel models, run first Alembic migration
- Async CRUD helpers for game/player/round

### Phase 4 — REST + WebSocket Backend
- `/api/games` create/get endpoints
- WS endpoint + room manager
- Connect engine to WS events (state machine per game)

### Phase 5 — Frontend
- `Home.tsx`: create / join form
- `Lobby.tsx`: player list, start button, WS connect
- `Game.tsx`: game table + all sub-components
- `useGameWS.ts`: WS hook that feeds Zustand store

### Phase 6 — Polish & Mobile UX
- Tailwind card styling with suit colors
- Touch-friendly card selection
- Error states, disconnect handling, reconnect on page reload

---

## Dev Setup & Verification

**Start backend:**
```
cd backend
uv run uvicorn app.main:app --reload
```

**Start frontend:**
```
cd frontend
pnpm dev
```

**PostgreSQL:** run locally (or any accessible instance), connection via `DATABASE_URL` in `.env`.

**Test flow:**
1. Open 3 browser tabs, each enters a nickname
2. Tab 1 creates game → shares room code → others join
3. Tab 1 (host) starts game — each tab sees its own hand only
4. Play through a full round: bid → play cards → trick resolves → scores shown
5. Play through all rounds → final scoreboard shown
6. Verify mobile layout at 390px viewport width (browser DevTools)
