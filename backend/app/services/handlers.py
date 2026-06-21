from sqlmodel import select

from app.database import AsyncSessionLocal
from app.models.game import Game
from app.models.player import Player
from app.models.round import Round
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


async def handle_start_game(room_code: str, player_id: str, payload: dict):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Game).where(Game.room_code == room_code))
        game = result.scalar_one_or_none()
        if not game or game.status != "waiting":
            return

        result = await session.execute(select(Player).where(Player.game_id == game.id))
        players = sorted(result.scalars().all(), key=lambda p: p.seat_order)

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

        # Build in-memory game state and deal round 1
        gs = GameState(str(game.id), num_players, game.max_players)
        for p in players:
            gs.add_player(str(p.id), p.seat_order)
        gs.start_round(1, dealer_seat=0)

        # Persist game state changes
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

        room_manager.game_states[room_code] = gs

        # Broadcast full game state — Lobby clients see in_progress and navigate to /game
        await room_manager.broadcast(
            room_code, {"type": "game_state", "payload": _state_payload(game, players)}
        )

        # Send each player their private hand
        for p in players:
            pid = str(p.id)
            await room_manager.send_to_player(room_code, pid, {
                "type": "round_started",
                "payload": {
                    "round_number": 1,
                    "hand": gs.hands.get(pid, []),
                    "trump_card": gs.trump_card,
                    "trump_suit": gs.trump_suit,
                    "dealer_seat": 0,
                    "first_bidder_seat": gs.current_player_seat,
                    "total_rounds": gs.total_rounds,
                },
            })


def register_all(manager=None):
    m = manager or room_manager
    m.register("start_game", handle_start_game)
