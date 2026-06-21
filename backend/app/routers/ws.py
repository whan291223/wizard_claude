import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.room_manager import room_manager

router = APIRouter()


@router.websocket("/ws/{room_code}/{player_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_code: str,
    player_id: uuid.UUID,
):
    await room_manager.connect(room_code, str(player_id), websocket)
    try:
        await room_manager.broadcast(
            room_code,
            {"type": "player_connected", "payload": {"player_id": str(player_id)}},
        )
        while True:
            data = await websocket.receive_json()
            await room_manager.handle_message(room_code, str(player_id), data)
    except WebSocketDisconnect:
        room_manager.disconnect(room_code, str(player_id))
        await room_manager.broadcast(
            room_code,
            {"type": "player_disconnected", "payload": {"player_id": str(player_id)}},
        )
