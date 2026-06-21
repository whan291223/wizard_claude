import uuid
from typing import Optional

from pydantic import BaseModel


class CreateGameRequest(BaseModel):
    nickname: str
    max_players: int = 6


class JoinGameRequest(BaseModel):
    nickname: str


class CreateGameResponse(BaseModel):
    room_code: str
    game_id: uuid.UUID
    player_id: uuid.UUID


class PlayerInfo(BaseModel):
    id: uuid.UUID
    nickname: str
    seat_order: int
    is_host: bool
    total_score: int
    is_connected: bool


class GameStateResponse(BaseModel):
    game_id: uuid.UUID
    room_code: str
    status: str
    num_players: int
    max_players: int
    current_round: int
    total_rounds: int
    current_phase: str
    dealer_seat: int
    current_player_seat: int
    trump_suit: Optional[str]
    trump_card: Optional[str]
    players: list[PlayerInfo]
