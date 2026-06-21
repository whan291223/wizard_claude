import random

SUITS = ["C", "D", "H", "S"]
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
RANK_VALUE = {r: i + 2 for i, r in enumerate(RANKS)}  # 2→2, A→14

WIZARD_PREFIX = "W"
JESTER_PREFIX = "N"  # N for N(o-value), avoids clash with Jack "J" in card strings


def build_deck() -> list[str]:
    regular = [f"{suit}{rank}" for suit in SUITS for rank in RANKS]
    wizards = [f"{WIZARD_PREFIX}{i}" for i in range(1, 5)]
    jesters = [f"{JESTER_PREFIX}{i}" for i in range(1, 5)]
    return regular + wizards + jesters


def shuffle_deck(deck: list[str]) -> list[str]:
    d = deck.copy()
    random.shuffle(d)
    return d


def is_wizard(card: str) -> bool:
    return card.startswith(WIZARD_PREFIX)


def is_jester(card: str) -> bool:
    return card.startswith(JESTER_PREFIX)


def get_suit(card: str) -> str | None:
    if is_wizard(card) or is_jester(card):
        return None
    return card[0]


def get_rank_value(card: str) -> int:
    if is_wizard(card) or is_jester(card):
        return 0
    rank = card[1:]
    return RANK_VALUE.get(rank, 0)


def deal(deck: list[str], num_players: int, round_number: int) -> tuple[list[list[str]], str | None]:
    """Returns (hands, trump_card). trump_card is None if deck exhausted."""
    hands: list[list[str]] = [[] for _ in range(num_players)]
    idx = 0
    for _ in range(round_number):
        for p in range(num_players):
            hands[p].append(deck[idx])
            idx += 1
    trump_card = deck[idx] if idx < len(deck) else None
    return hands, trump_card
