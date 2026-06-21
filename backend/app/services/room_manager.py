from collections import defaultdict

from fastapi import WebSocket


class RoomManager:
    def __init__(self):
        self.rooms: dict[str, dict[str, WebSocket]] = defaultdict(dict)
        self._message_handlers: dict[str, callable] = {}

    async def connect(self, room_code: str, player_id: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms[room_code][player_id] = websocket

    def disconnect(self, room_code: str, player_id: str):
        self.rooms[room_code].pop(player_id, None)
        if not self.rooms[room_code]:
            self.rooms.pop(room_code, None)

    def player_count(self, room_code: str) -> int:
        return len(self.rooms.get(room_code, {}))

    async def send_to_player(self, room_code: str, player_id: str, message: dict):
        ws = self.rooms.get(room_code, {}).get(player_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(room_code, player_id)

    async def broadcast(self, room_code: str, message: dict, exclude: str | None = None):
        disconnected = []
        for pid, ws in list(self.rooms.get(room_code, {}).items()):
            if pid == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(pid)
        for pid in disconnected:
            self.disconnect(room_code, pid)

    async def handle_message(self, room_code: str, player_id: str, data: dict):
        """Dispatch incoming WS message — wired up in Phase 4."""
        msg_type = data.get("type")
        handler = self._message_handlers.get(msg_type)
        if handler:
            await handler(room_code, player_id, data.get("payload", {}))
        else:
            await self.send_to_player(
                room_code,
                player_id,
                {"type": "error", "payload": {"message": f"Unknown message type: {msg_type}"}},
            )


room_manager = RoomManager()
