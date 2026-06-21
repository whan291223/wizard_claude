import uuid
from typing import Optional

from sqlmodel import Field, SQLModel


class Player(SQLModel, table=True):
    __tablename__ = "players"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    game_id: uuid.UUID = Field(foreign_key="games.id", index=True)
    nickname: str = Field(max_length=32)
    seat_order: int
    is_host: bool = Field(default=False)
    total_score: int = Field(default=0)
    is_connected: bool = Field(default=True)
