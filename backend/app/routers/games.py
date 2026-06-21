import random
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models.game import Game
from app.models.player import Player
from app.schemas.game import (
    CreateGameRequest,
    CreateGameResponse,
    GameStateResponse,
    JoinGameRequest,
    PlayerInfo,
)

router = APIRouter()


def _generate_room_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _build_game_state(game: Game, players: list[Player]) -> GameStateResponse:
    return GameStateResponse(
        game_id=game.id,
        room_code=game.room_code,
        status=game.status,
        num_players=game.num_players,
        max_players=game.max_players,
        current_round=game.current_round,
        total_rounds=game.total_rounds,
        current_phase=game.current_phase,
        dealer_seat=game.dealer_seat,
        current_player_seat=game.current_player_seat,
        trump_suit=game.trump_suit,
        trump_card=game.trump_card,
        players=[
            PlayerInfo(
                id=p.id,
                nickname=p.nickname,
                seat_order=p.seat_order,
                is_host=p.is_host,
                total_score=p.total_score,
                is_connected=p.is_connected,
            )
            for p in sorted(players, key=lambda x: x.seat_order)
        ],
    )


@router.post("/games", response_model=CreateGameResponse)
async def create_game(
    body: CreateGameRequest,
    session: AsyncSession = Depends(get_session),
):
    room_code = _generate_room_code()
    game = Game(room_code=room_code, max_players=body.max_players)
    session.add(game)
    await session.flush()

    player = Player(
        game_id=game.id,
        nickname=body.nickname,
        seat_order=0,
        is_host=True,
    )
    game.num_players = 1
    session.add(player)
    await session.commit()
    await session.refresh(game)
    await session.refresh(player)

    return CreateGameResponse(
        room_code=room_code,
        game_id=game.id,
        player_id=player.id,
    )


@router.post("/games/{room_code}/join", response_model=CreateGameResponse)
async def join_game(
    room_code: str,
    body: JoinGameRequest,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Game).where(Game.room_code == room_code))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if game.status != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    if game.num_players >= game.max_players:
        raise HTTPException(status_code=400, detail="Game is full")

    player = Player(
        game_id=game.id,
        nickname=body.nickname,
        seat_order=game.num_players,
        is_host=False,
    )
    game.num_players += 1
    session.add(player)
    await session.commit()
    await session.refresh(player)

    return CreateGameResponse(
        room_code=room_code,
        game_id=game.id,
        player_id=player.id,
    )


@router.get("/games/{room_code}", response_model=GameStateResponse)
async def get_game(
    room_code: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Game).where(Game.room_code == room_code))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    result = await session.execute(select(Player).where(Player.game_id == game.id))
    players = result.scalars().all()

    return _build_game_state(game, list(players))
