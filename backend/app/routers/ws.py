import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import select

from app.database import AsyncSessionLocal
from app.models.game import Game
from app.models.player import Player
from app.services.room_manager import room_manager

router = APIRouter()


async def _game_state_payload(room_code: str) -> dict | None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Game).where(Game.room_code == room_code))
        game = result.scalar_one_or_none()
        if not game:
            return None
        result = await session.execute(select(Player).where(Player.game_id == game.id))
        players = result.scalars().all()
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


async def _set_connected(player_id: uuid.UUID, connected: bool):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Player).where(Player.id == player_id))
        player = result.scalar_one_or_none()
        if player:
            player.is_connected = connected
            await session.commit()


@router.websocket("/ws/{room_code}/{player_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_code: str,
    player_id: uuid.UUID,
):
    await room_manager.connect(room_code, str(player_id), websocket)
    await _set_connected(player_id, True)

    # Broadcast updated game state so all lobby members see the new player
    state = await _game_state_payload(room_code)
    if state:
        await room_manager.broadcast(room_code, {"type": "game_state", "payload": state})

    try:
        while True:
            data = await websocket.receive_json()
            await room_manager.handle_message(room_code, str(player_id), data)
    except WebSocketDisconnect:
        room_manager.disconnect(room_code, str(player_id))
        await _set_connected(player_id, False)

        state = await _game_state_payload(room_code)
        if state:
            await room_manager.broadcast(room_code, {"type": "game_state", "payload": state})
