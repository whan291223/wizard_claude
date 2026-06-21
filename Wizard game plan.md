# Wizard (Trick-Taking Card Game) — Project Plan

Real-time multiplayer mobile app. Solo hobby build.

**Stack:** FastAPI (WebSockets) backend · React Native (Expo) frontend · SQLite + SQLAlchemy · Pydantic for state/contracts.

---

## 0. Game Rules Recap (so the data model makes sense)

- 3–6 players. Deck: 60 cards — standard 52 + 4 Wizards + 4 Jesters.
- Game = N rounds, where N = 60 / players (e.g. 5 players → 12 rounds). Round 1 deals 1 card/player, round 2 deals 2, etc., up to the max, optionally back down.
- Each round: deal cards → flip next card to set trump (Wizard flip = dealer picks trump; Jester flip = no trump) → players bid (in turn order) how many tricks they'll take → play tricks (Wizard always wins the trick it's played in unless an earlier Wizard was played; Jester always loses unless all cards in trick are Jesters) → score: exact bid = 20 + 10/trick, miss = -10 per trick off.
- Last round: no trump card flip (no cards left); often house-ruled — keep this configurable.

This recap matters because it drives the **state machine** in section 2.

---

## 1. Architecture Plan

### 1.1 High-Level Topology

```
┌─────────────────┐         WebSocket (game events)        ┌──────────────────────┐
│  React Native    │ ───────────────────────────────────▶  │   FastAPI Backend     │
│  (Expo) App       │ ◀───────────────────────────────────  │   (single process)    │
│  iOS / Android    │         REST (auth, lobby, history)    │                       │
└─────────────────┘ ───────────────────────────────────▶  │  ┌─────────────────┐  │
                                                              │  │ In-memory        │  │
                                                              │  │ GameRoom objects │  │
                                                              │  └─────────────────┘  │
                                                              │  ┌─────────────────┐  │
                                                              │  │ SQLite (via      │  │
                                                              │  │ SQLAlchemy)      │  │
                                                              │  │ users, history   │  │
                                                              │  └─────────────────┘  │
                                                              └──────────────────────┘
```

**Why this shape:**
- **One process, in-memory game state.** A `GameRoom` is a Python object living in server RAM, holding the full authoritative game state for one table (players, deck, trump, current trick, scores). No DB round-trip per card played — this is what makes the game feel instant. Acceptable risk for a hobby project: if the server restarts mid-game, that game is lost. You can add persistence-on-every-event later if that ever bites you.
- **WebSockets for gameplay, REST for everything else.** Bidding, playing a card, trump reveals — all pushed instantly over a persistent WS connection per player. Account creation, "my game history," "join a public room list" — plain REST, because they're request/response, not streams.
- **SQLite, one file.** Stores: user accounts, completed game results, friend lists if you add them later. Not used for in-flight game state. Trivial to back up (copy the file) and trivial to inspect (`sqlite3` CLI).
- **No Redis, no Celery, no message broker.** You don't need pub/sub until you're running more than one backend process (horizontal scaling). A single Uvicorn process comfortably handles many WS connections for a card game's traffic pattern (small payloads, low frequency). Revisit only if you actually deploy multi-instance.

### 1.2 Backend Internal Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, mounts routers
│   ├── config.py                # settings (env vars)
│   ├── db/
│   │   ├── models.py            # SQLAlchemy models: User, GameRecord
│   │   └── session.py           # engine/session setup
│   ├── auth/
│   │   ├── routes.py            # /auth/register, /auth/login
│   │   └── security.py          # JWT issue/verify, password hashing
│   ├── game/
│   │   ├── models.py            # Pydantic: Card, Player, Bid, Trick, RoundState
│   │   ├── engine.py            # Pure game logic: deal, score, resolve_trick, valid_bids
│   │   ├── room.py              # GameRoom class: holds state + orchestrates a live game
│   │   └── room_manager.py      # dict of room_id -> GameRoom, create/join/cleanup
│   ├── ws/
│   │   ├── connection_manager.py # tracks live sockets per room, broadcast/send helpers
│   │   └── routes.py             # /ws/{room_id} endpoint, message dispatch
│   └── api/
│       └── lobby_routes.py      # REST: list rooms, create room, game history
├── tests/
│   ├── test_engine.py           # unit tests on pure game logic (no network, no DB)
│   └── test_ws_flow.py          # integration: simulate a full round over WS
├── requirements.txt
└── alembic/                     # DB migrations (once schema stabilizes)
```

**Key separation: `game/engine.py` is pure functions, no I/O.** `deal_round(players, round_num) -> RoundState`, `resolve_trick(trick) -> winner`, `score_round(bids, tricks_won) -> dict[player, points]`. These take and return plain Pydantic objects — no WebSocket, no DB, no FastAPI imports. This is the single highest-leverage architecture decision for a solo dev: you can unit-test the entire rules engine in milliseconds without spinning up a server, and bugs in scoring/trick-resolution (the easiest place to get Wizard wrong) get caught before they ever touch a real game.

`GameRoom` (in `room.py`) is the stateful wrapper: it owns one `engine`-produced state, knows which sockets are in the room, and translates between "player sent a WS message" and "call the right pure function, then broadcast the result."

### 1.3 Frontend Internal Structure

```
mobile/
├── App.tsx
├── src/
│   ├── api/
│   │   ├── client.ts             # REST calls (axios/fetch wrapper)
│   │   └── socket.ts             # WS connection manager, typed event handlers
│   ├── screens/
│   │   ├── LobbyScreen.tsx
│   │   ├── GameScreen.tsx        # main table view
│   │   └── ResultsScreen.tsx
│   ├── components/
│   │   ├── Card.tsx
│   │   ├── Hand.tsx
│   │   ├── TrickArea.tsx
│   │   ├── BidSelector.tsx
│   │   └── ScoreBoard.tsx
│   ├── state/
│   │   └── gameStore.ts          # Zustand store, single source of truth for game state
│   └── types/
│       └── game.ts               # TS types mirroring backend Pydantic models
└── package.json
```

**State management: Zustand, not Redux.** Game state is a single tree (one active game at a time) pushed wholesale from the server on most events — you don't need Redux's action/reducer ceremony for that. The store basically mirrors whatever JSON the server's last broadcast contained.

**Critical discipline: the server is the only source of truth.** The client never decides "is this bid valid" or "did I win the trick" — it sends an intent (`{action: "play_card", card: "R7"}`) and renders whatever state the server broadcasts back. This avoids an entire category of cheating/desync bugs and means your rules engine only has to be correct in one place.

### 1.4 Real-Time Protocol Shape

One WS connection per player, established after REST login + joining a room. JSON messages, each with a `type` field.

**Client → Server:** `join_room`, `start_game` (host only), `place_bid`, `play_card`, `leave_room`.

**Server → Client (broadcast to room):** `room_state` (full snapshot on join/reconnect), `round_started` (hand sizes, trump), `bid_placed`, `trick_played`, `trick_resolved` (winner), `round_scored`, `game_over`.

Sending a full `room_state` snapshot on join/reconnect (rather than relying on a stream of deltas) is what makes reconnect-after-app-backgrounding trivial — extremely important on mobile, where iOS/Android will suspend or kill your WS connection constantly. Client reconnects → sends `join_room` again → server replies with the complete current state → UI just re-renders.

### 1.5 Deployment (when you get there)

- Backend: a single small VM or a container host (Fly.io / Railway / a $5 VPS) running Uvicorn behind a process manager. WebSockets need "sticky"/long-lived connections — avoid serverless platforms that kill long-running connections (e.g. plain AWS Lambda) for the WS endpoint.
- Mobile: Expo's EAS Build for actual App Store/Play Store binaries when ready; Expo Go for all development.
- TLS termination (wss://) required for any real deployment — plan for a reverse proxy (Caddy/Nginx) or your host's built-in HTTPS.

---

## 2. Design Plan

### 2.1 Game State Machine

```
LOBBY → DEALING → BIDDING → TRICK_PLAYING → TRICK_RESOLVED (loop until round's cards exhausted)
      → ROUND_SCORED → (next round: DEALING, or) → GAME_OVER
```

Each `GameRoom` is always in exactly one of these states; invalid actions for the current state (e.g. playing a card during BIDDING) are rejected with an error message back to that client, not silently ignored.

### 2.2 Core Data Model (Pydantic, shared conceptually with TS types)

```python
class Suit(str, Enum):
    RED = "R"; YELLOW = "Y"; GREEN = "G"; BLUE = "B"

class Card(BaseModel):
    suit: Suit | None      # None for Wizard/Jester
    rank: int | None       # 1-13, None for Wizard/Jester
    special: Literal["wizard", "jester"] | None = None

class Player(BaseModel):
    id: str
    name: str
    hand: list[Card]
    bid: int | None
    tricks_won: int
    score: int
    connected: bool          # tracks live WS presence for reconnect UI

class Trick(BaseModel):
    cards_played: list[tuple[str, Card]]   # (player_id, card), in play order
    lead_suit: Suit | None
    winner_id: str | None

class RoundState(BaseModel):
    round_number: int
    trump_suit: Suit | None
    trump_card: Card | None
    dealer_id: str
    current_trick: Trick
    tricks_so_far: list[Trick]
    bidding_order: list[str]
    turn_order: list[str]

class GameRoom(BaseModel):
    room_id: str
    players: list[Player]
    state: GamePhase            # the state machine enum above
    round: RoundState | None
    round_history: list[dict]   # for the scoreboard across all rounds
```

### 2.3 Trick Resolution Logic (the trickiest rules to encode)

This is worth spelling out explicitly since it's the most bug-prone part of any Wizard implementation:

1. First Wizard played in a trick wins it outright, regardless of what's played after.
2. If no Wizard played: highest trump suit card wins; if no trump played, highest card of the lead suit wins.
3. Jesters never win a trick on their own merit (lowest priority) — except the edge case where *every* card in the trick is a Jester, in which case the first Jester played wins.
4. Lead suit is set by the first non-Jester card played (if the very first card is a Jester, the next non-Jester card sets the lead suit; if the entire trick is Jesters, there's no lead suit and rule 3's edge case applies).

Encode this as a single pure function `resolve_trick(trick: Trick, trump_suit: Suit | None) -> player_id`, and write unit tests for every rule above individually plus the edge cases (all-Jester trick, Wizard-then-Wizard, Jester-led trick) before building anything else on top of it.

### 2.4 REST Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | create account |
| POST | `/auth/login` | returns JWT |
| GET | `/rooms` | list open/joinable rooms |
| POST | `/rooms` | create a room (becomes host) |
| GET | `/rooms/{id}` | room metadata (for join screen) |
| GET | `/users/me/history` | past completed games |

### 2.5 WebSocket Message Contract (illustrative)

```jsonc
// Client → Server
{"type": "place_bid", "bid": 2}
{"type": "play_card", "card": {"suit": "R", "rank": 7}}

// Server → Client (broadcast)
{"type": "trick_resolved", "winner_id": "p2", "trick": {...}}
{"type": "round_scored", "scores": {"p1": 20, "p2": -10, "p3": 30}}
```

Every server message includes the full updated relevant slice of state (not just a diff) — simpler to reason about, and at Wizard's payload size (a few dozen cards, max 6 players) there's no real bandwidth cost.

### 2.6 Mobile UI Screens

1. **Lobby** — list of rooms / create / join by code.
2. **Waiting room** — players assembled, host hits Start.
3. **Game table** — the core screen: your hand (bottom), trick area (center), trump indicator, other players' card-backs + tricks-won counts arranged around the table, bid input when it's your bidding turn.
4. **Round scoreboard** — shown briefly between rounds.
5. **Final results** — game over screen, winner, full score history table.

---

## 3. Development Plan (Phased — working software at every step)

Each phase ends with something you can actually run and verify, so momentum doesn't stall waiting for "everything" to be done.

### Phase 0 — Setup (½ day)
- FastAPI project skeleton + `uvicorn` running locally with one health-check route.
- Expo project skeleton running in Expo Go on your phone, showing a static "Hello Wizard" screen.
- Confirm phone can hit your laptop's FastAPI server over local wifi (this trips people up — note it below).

### Phase 1 — Game Engine, No Networking (1–2 days)
- Build `game/engine.py` and `game/models.py` entirely.
- Write `tests/test_engine.py` covering: dealing, bid validation, **all** trick-resolution rules from 2.3, scoring math, round progression, full-game-to-completion simulation with 4 fake players and scripted bids/plays.
- Goal: you can run a complete game in a Python script/test with zero UI and trust the score at the end. This is the foundation everything else sits on — don't rush it.

### Phase 2 — Single-Player-Against-Server Loop, No Real-Time Yet (1 day)
- Plain REST endpoints that let one client step through a game turn-by-turn (create room, deal, bid, play) just to prove `GameRoom` correctly wraps `engine.py`.
- No WebSocket yet, no second player yet — this isolates "does the room orchestration work" from "does real-time work," so bugs are easier to locate.

### Phase 3 — WebSockets + Two Local Clients (2–3 days)
- Add `/ws/{room_id}`, `connection_manager.py`, message dispatch.
- Test by opening two browser tabs (use a tiny HTML/JS test page, not the mobile app yet) connected as two different players in the same room, playing a full round between them.
- This is the riskiest technical phase (state sync, broadcast correctness, reconnect-on-drop) — prove it works outside the mobile app first so you're not debugging WS plumbing and React Native simultaneously.

### Phase 4 — Mobile UI: Static Then Wired (3–5 days)
- Build screens from 2.6 first against **hardcoded mock data** (no networking) — gets the visual layout and card components right in isolation.
- Then wire `socket.ts` + `gameStore.ts` to the real backend, replacing mocks with live state.
- Test on a real device via Expo Go throughout, not just simulator — touch interactions for picking/playing cards matter.

### Phase 5 — Auth + Persistence (1–2 days)
- SQLite models, register/login, JWT, protect room creation behind login.
- Save completed games to `GameRecord` table when a `GameRoom` reaches `GAME_OVER`.

### Phase 6 — Polish for Real-World Mobile Conditions (2–4 days, ongoing)
- Reconnect flow: app backgrounded → WS drops → app foregrounded → rejoin + full state resync (this is where the "send full snapshot, not deltas" decision from 1.4 pays off).
- Handle a player disconnecting mid-game gracefully (pause? auto-bid lowest? your call — but design it on purpose, don't let it crash the room for everyone else).
- Basic animations for card plays/trick collection — even simple ones make the table feel alive.

### Phase 7 — Deploy (1–2 days, whenever you're ready to test beyond your wifi)
- Backend to Fly.io/Railway/VPS with `wss://`.
- Update mobile app's API base URL via env config.
- Real test: you + a friend, on different networks, same game.

---

## Open Questions to Settle Before/During Build

- **Bid restriction house rule**: many Wizard variants forbid the dealer's bid from making total bids equal tricks available (forces at least one miss). Decide now — it's a one-line change in `engine.py` bid validation but changes game feel.
- **Disconnect/reconnect grace period**: how long does a `GameRoom` wait for a disconnected player before... what? (auto-play, skip, end game) — needs a decision before Phase 6.
- **Round progression**: up-then-down (1,2,3...max,...3,2,1) or just up to max once? Both are common house rules — make it a room setting (`max_only` vs `up_and_down`) rather than hardcoding.

---

*Suggested next step: scaffold Phase 0 and Phase 1 together — get `engine.py` and its tests written first, since literally nothing else in this plan can be correct if trick resolution and scoring aren't.*