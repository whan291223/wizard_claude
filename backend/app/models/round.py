import uuid
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Round(SQLModel, table=True):
    __tablename__ = "rounds"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    game_id: uuid.UUID = Field(foreign_key="games.id", index=True)
    round_number: int
    trump_card: Optional[str] = Field(default=None)
    bids: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    tricks_won: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    scores: Optional[dict] = Field(default=None, sa_column=Column(JSONB))


class Trick(SQLModel, table=True):
    __tablename__ = "tricks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    round_id: uuid.UUID = Field(foreign_key="rounds.id", index=True)
    trick_number: int
    cards_played: Optional[list] = Field(default=None, sa_column=Column(JSONB))
    winner_player_id: Optional[uuid.UUID] = Field(default=None, foreign_key="players.id")
    led_suit: Optional[str] = Field(default=None)
