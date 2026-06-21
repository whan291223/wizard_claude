import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Game(SQLModel, table=True):
    __tablename__ = "games"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    room_code: str = Field(max_length=6, unique=True, index=True)
    status: str = Field(default="waiting")  # waiting / in_progress / finished
    num_players: int = Field(default=0)
    max_players: int = Field(default=6)
    current_round: int = Field(default=0)
    total_rounds: int = Field(default=0)
    current_phase: str = Field(default="waiting")  # waiting / dealing / bidding / playing / scoring
    dealer_seat: int = Field(default=0)
    current_player_seat: int = Field(default=0)
    trump_suit: Optional[str] = Field(default=None)  # C/D/H/S/none/pending
    trump_card: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
