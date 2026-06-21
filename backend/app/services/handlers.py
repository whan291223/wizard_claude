from sqlmodel import select

from app.database import AsyncSessionLocal
from app.models.game import Game
from app.models.player import Player
from app.models.round import Round
from app.services.deck import build_deck, shuffle_deck
from app.services.game_engine import GameState
from app.services.room_manager import room_manager


def _state_payload(game: Game, players: list[Player]) -> dict:
    return {
        "game_id": str(game.id),
        "room_code": game.room_code,
        "status": game.status,
        "num_players": game.num_players,
        "max_players": game.max_players,
        "current_round": game.current_round,
        "total_rounds": game.total_rounds,
        "current_phase": game.current_phase,
        "dealer_seat": game.dealer_seat,
        "current_player_seat": game.current_player_seat,
        "trump_suit": game.trump_suit,
        "trump_card": game.trump_card,
        "players": [
            {
                "id": str(p.id),
                "nickname": p.nickname,
                "seat_order": p.seat_order,
                "is_host": p.is_host,
                "total_score": p.total_score,
                "is_connected": p.is_connected,
            }
            for p in sorted(players, key=lambda x: x.seat_order)
        ],
    }


async def _load_game_and_players(session, room_code: str):
    result = await session.execute(select(Game).where(Game.room_code == room_code))
    game = result.scalar_one_or_none()
    if not game:
        return None, []
    result = await session.execute(select(Player).where(Player.game_id == game.id))
    players = sorted(result.scalars().all(), key=lambda p: p.seat_order)
    return game, players


async def _broadcast_game_state(room_code: str):
    async with AsyncSessionLocal() as session:
        game, players = await _load_game_and_players(session, room_code)
        if game:
            await room_manager.broadcast(
                room_code, {"type": "game_state", "payload": _state_payload(game, players)}
            )


async def _send_round_started(room_code: str, gs: GameState, game: Game):
    for pid, hand in gs.hands.items():
        await room_manager.send_to_player(room_code, pid, {
            "type": "round_started",
            "payload": {
                "round_number": game.current_round,
                "hand": hand,
                "trump_card": gs.trump_card,
                "trump_suit": gs.trump_suit,
                "dealer_seat": game.dealer_seat,
                "first_bidder_seat": gs.current_player_seat,
                "total_rounds": game.total_rounds,
            },
        })


# ---------------------------------------------------------------------------
# start_game
# ---------------------------------------------------------------------------

async def handle_start_game(room_code: str, player_id: str, payload: dict):
    async with AsyncSessionLocal() as session:
        game, players = await _load_game_and_players(session, room_code)
        if not game or game.status != "waiting":
            return

        caller = next((p for p in players if str(p.id) == player_id), None)
        if not caller or not caller.is_host:
            await room_manager.send_to_player(
                room_code, player_id,
                {"type": "error", "payload": {"message": "Only the host can start the game"}},
            )
            return

        if len(players) < 3:
            await room_manager.send_to_player(
                room_code, player_id,
                {"type": "error", "payload": {"message": "Need at least 3 players to start"}},
            )
            return

        num_players = len(players)
        gs = GameState(str(game.id), num_players, game.max_players)
        for p in players:
            gs.add_player(str(p.id), p.seat_order)
        gs.start_round(1, dealer_seat=0)

        game.status = "in_progress"
        game.num_players = num_players
        game.total_rounds = gs.total_rounds
        game.current_round = 1
        game.dealer_seat = 0
        game.current_player_seat = gs.current_player_seat
        game.trump_suit = gs.trump_suit
        game.trump_card = gs.trump_card
        game.current_phase = "choosing_trump" if gs.trump_suit == "pending" else "bidding"

        round_record = Round(
            game_id=game.id,
            round_number=1,
            trump_card=gs.trump_card,
            bids={},
            tricks_won={},
            scores={},
        )
        session.add(round_record)
        await session.commit()
        await session.refresh(game)

        room_manager.game_states[room_code] = gs

        await room_manager.broadcast(
            room_code, {"type": "game_state", "payload": _state_payload(game, players)}
        )
        await _send_round_started(room_code, gs, game)


# ---------------------------------------------------------------------------
# choose_trump  (dealer picks suit when a Wizard was flipped)
# ---------------------------------------------------------------------------

async def handle_choose_trump(room_code: str, player_id: str, payload: dict):
    gs = room_manager.game_states.get(room_code)
    if not gs or gs.trump_suit != "pending":
        return

    async with AsyncSessionLocal() as session:
        game, players = await _load_game_and_players(session, room_code)
        if not game:
            return

        dealer_id = gs.seat_to_player.get(game.dealer_seat)
        if player_id != dealer_id:
            await room_manager.send_to_player(
                room_code, player_id,
                {"type": "error", "payload": {"message": "Only the dealer chooses trump"}},
            )
            return

        suit = payload.get("suit", "")
        if suit not in ("C", "D", "H", "S"):
            await room_manager.send_to_player(
                room_code, player_id,
                {"type": "error", "payload": {"message": "Invalid suit"}},
            )
            return

        gs.trump_suit = suit
        game.trump_suit = suit
        game.current_phase = "bidding"
        await session.commit()
        await session.refresh(game)

    await room_manager.broadcast(
        room_code, {"type": "game_state", "payload": _state_payload(game, players)}
    )


# ---------------------------------------------------------------------------
# submit_bid
# ---------------------------------------------------------------------------

async def handle_submit_bid(room_code: str, player_id: str, payload: dict):
    gs = room_manager.game_states.get(room_code)
    if not gs:
        return

    bid = payload.get("bid")
    if not isinstance(bid, int) or bid < 0 or bid > gs.current_round:
        await room_manager.send_to_player(
            room_code, player_id,
            {"type": "error", "payload": {"message": f"Bid must be 0–{gs.current_round}"}},
        )
        return

    if gs.player_to_seat.get(player_id) != gs.current_player_seat:
        await room_manager.send_to_player(
            room_code, player_id,
            {"type": "error", "payload": {"message": "Not your turn to bid"}},
        )
        return

    if not gs.submit_bid(player_id, bid):
        await room_manager.send_to_player(
            room_code, player_id,
            {"type": "error", "payload": {"message": "You already bid this round"}},
        )
        return

    all_bids = gs.all_bids_in()

    async with AsyncSessionLocal() as session:
        game, players = await _load_game_and_players(session, room_code)
        if not game:
            return

        result = await session.execute(
            select(Round).where(
                Round.game_id == game.id,
                Round.round_number == gs.current_round,
            )
        )
        round_record = result.scalar_one_or_none()
        if round_record:
            round_record.bids = {**(round_record.bids or {}), player_id: bid}

        game.current_player_seat = gs.current_player_seat
        if all_bids:
            game.current_phase = "playing"
            gs.start_trick()

        await session.commit()
        await session.refresh(game)

    await room_manager.broadcast(room_code, {
        "type": "bid_submitted",
        "payload": {"player_id": player_id, "bid": bid},
    })

    # Always broadcast game_state so all clients see the updated current_player_seat
    await _broadcast_game_state(room_code)

    if all_bids:
        await room_manager.broadcast(room_code, {
            "type": "all_bids_in",
            "payload": {"bids": gs.bids},
        })


# ---------------------------------------------------------------------------
# play_card
# ---------------------------------------------------------------------------

async def handle_play_card(room_code: str, player_id: str, payload: dict):
    gs = room_manager.game_states.get(room_code)
    if not gs:
        return

    card = payload.get("card", "")

    if gs.player_to_seat.get(player_id) != gs.current_player_seat:
        await room_manager.send_to_player(
            room_code, player_id,
            {"type": "error", "payload": {"message": "Not your turn to play"}},
        )
        return

    if not gs.play_card(player_id, card):
        await room_manager.send_to_player(
            room_code, player_id,
            {"type": "error", "payload": {"message": "Illegal card play"}},
        )
        return

    await room_manager.broadcast(room_code, {
        "type": "card_played",
        "payload": {"player_id": player_id, "card": card},
    })

    trick_complete = len(gs.current_trick) == gs.num_players

    if not trick_complete:
        async with AsyncSessionLocal() as session:
            game, _ = await _load_game_and_players(session, room_code)
            if game:
                game.current_player_seat = gs.current_player_seat
                await session.commit()
        await _broadcast_game_state(room_code)
        return

    # --- Trick complete ---
    trick_cards = list(gs.current_trick)
    winner_id = gs.resolve_trick()

    await room_manager.broadcast(room_code, {
        "type": "trick_complete",
        "payload": {
            "winner_id": winner_id,
            "cards": [{"player_id": pid, "card": c} for pid, c in trick_cards],
        },
    })

    if not gs.round_over():
        gs.start_trick()
        async with AsyncSessionLocal() as session:
            game, _ = await _load_game_and_players(session, room_code)
            if game:
                game.current_player_seat = gs.current_player_seat
                await session.commit()
        await _broadcast_game_state(room_code)
        return

    # --- Round complete ---
    scores = gs.compute_scores()

    async with AsyncSessionLocal() as session:
        game, players = await _load_game_and_players(session, room_code)
        if not game:
            return

        result = await session.execute(
            select(Round).where(
                Round.game_id == game.id,
                Round.round_number == gs.current_round,
            )
        )
        round_record = result.scalar_one_or_none()
        if round_record:
            round_record.tricks_won = dict(gs.tricks_won)
            round_record.scores = {pid: s for pid, s in scores.items()}

        cumulative: dict[str, int] = {}
        for p in players:
            delta = scores.get(str(p.id), 0)
            p.total_score = (p.total_score or 0) + delta
            cumulative[str(p.id)] = p.total_score

        await session.commit()
        await session.refresh(game)

        await room_manager.broadcast(room_code, {
            "type": "round_complete",
            "payload": {"scores": scores, "cumulative_scores": cumulative},
        })

        if gs.current_round >= gs.total_rounds:
            game.status = "finished"
            game.current_phase = "waiting"
            await session.commit()
            await room_manager.broadcast(room_code, {
                "type": "game_complete",
                "payload": {"final_scores": cumulative},
            })
            return

        # --- Start next round ---
        next_round = gs.current_round + 1
        new_dealer = (game.dealer_seat + 1) % gs.num_players
        gs.start_round(next_round, dealer_seat=new_dealer)

        game.current_round = next_round
        game.dealer_seat = new_dealer
        game.current_player_seat = gs.current_player_seat
        game.trump_suit = gs.trump_suit
        game.trump_card = gs.trump_card
        game.current_phase = "choosing_trump" if gs.trump_suit == "pending" else "bidding"

        new_round_record = Round(
            game_id=game.id,
            round_number=next_round,
            trump_card=gs.trump_card,
            bids={},
            tricks_won={},
            scores={},
        )
        session.add(new_round_record)
        await session.commit()
        await session.refresh(game)

        # Re-fetch players with updated scores
        result = await session.execute(select(Player).where(Player.game_id == game.id))
        players = sorted(result.scalars().all(), key=lambda p: p.seat_order)

    await room_manager.broadcast(
        room_code, {"type": "game_state", "payload": _state_payload(game, players)}
    )
    await _send_round_started(room_code, gs, game)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register_all(manager=None):
    m = manager or room_manager
    m.register("start_game", handle_start_game)
    m.register("choose_trump", handle_choose_trump)
    m.register("submit_bid", handle_submit_bid)
    m.register("play_card", handle_play_card)
