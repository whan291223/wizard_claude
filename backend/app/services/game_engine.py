"""
Core game logic — Phase 2 implementation.
Handles: deal, bidding phase, trick-taking resolution, round scoring.
"""

from app.services.deck import (
    build_deck,
    deal,
    get_rank_value,
    get_suit,
    is_jester,
    is_wizard,
    shuffle_deck,
)
from app.services.scoring import calculate_round_scores


class GameState:
    """In-memory state for an active game room (complements the DB record)."""

    def __init__(self, game_id: str, num_players: int, max_players: int):
        self.game_id = game_id
        self.num_players = num_players
        self.max_players = max_players
        self.total_rounds = 3  # TODO: revert to `60 // max_players` after testing

        # Per-round state
        self.deck: list[str] = []
        self.hands: dict[str, list[str]] = {}  # player_id → cards
        self.bids: dict[str, int] = {}
        self.tricks_won: dict[str, int] = {}
        self.trump_suit: str | None = None
        self.trump_card: str | None = None

        # Per-trick state
        self.current_trick: list[tuple[str, str]] = []  # [(player_id, card)]
        self.led_suit: str | None = None

        # Seat order
        self.seat_to_player: dict[int, str] = {}
        self.player_to_seat: dict[str, int] = {}
        self.dealer_seat: int = 0
        self.current_player_seat: int = 0
        self.current_round: int = 0
        self.trick_number: int = 0

    def add_player(self, player_id: str, seat: int):
        self.seat_to_player[seat] = player_id
        self.player_to_seat[player_id] = seat
        self.tricks_won[player_id] = 0

    def start_round(self, round_number: int, dealer_seat: int, deck: list[str] | None = None):
        self.current_round = round_number
        self.dealer_seat = dealer_seat
        self.bids = {}
        self.tricks_won = {pid: 0 for pid in self.player_to_seat}
        self.trick_number = 0

        self.deck = deck if deck is not None else shuffle_deck(build_deck())
        player_order = [
            self.seat_to_player[s % self.num_players]
            for s in range(self.num_players)
        ]
        hands_list, trump_card = deal(self.deck, self.num_players, round_number)
        self.hands = {pid: hands_list[i] for i, pid in enumerate(player_order)}
        self.trump_card = trump_card

        # deal() already skipped any flipped Wizard/Jester and gave us the first
        # suited card (or None if the deck ran out), so the suit follows directly.
        if trump_card is None:
            self.trump_suit = "none"
        else:
            self.trump_suit = get_suit(trump_card)

        # Bidding starts left of dealer
        self.current_player_seat = (dealer_seat + 1) % self.num_players

    def submit_bid(self, player_id: str, bid: int) -> bool:
        if player_id in self.bids:
            return False
        self.bids[player_id] = bid
        self._advance_seat()
        return True

    def all_bids_in(self) -> bool:
        return len(self.bids) == self.num_players

    def start_trick(self):
        self.current_trick = []
        self.led_suit = None

    def play_card(self, player_id: str, card: str) -> bool:
        hand = self.hands.get(player_id, [])
        if card not in hand:
            return False
        if not self._is_legal_play(player_id, card):
            return False

        hand.remove(card)
        self.current_trick.append((player_id, card))

        if self.led_suit is None and not is_wizard(card) and not is_jester(card):
            self.led_suit = get_suit(card)

        self._advance_seat()
        return True

    def resolve_trick(self) -> str:
        """Returns the player_id who wins the trick."""
        winner_pid, winner_card = self.current_trick[0]

        for pid, card in self.current_trick[1:]:
            if is_wizard(winner_card):
                break  # first wizard wins regardless
            if is_wizard(card):
                winner_pid, winner_card = pid, card
            elif is_jester(winner_card):
                if not is_jester(card):
                    winner_pid, winner_card = pid, card
            else:
                ts = self.trump_suit
                winner_suit = get_suit(winner_card)
                card_suit = get_suit(card)
                if ts and ts != "none" and card_suit == ts and winner_suit != ts:
                    winner_pid, winner_card = pid, card
                elif card_suit == winner_suit and get_rank_value(card) > get_rank_value(winner_card):
                    winner_pid, winner_card = pid, card

        self.tricks_won[winner_pid] = self.tricks_won.get(winner_pid, 0) + 1
        self.trick_number += 1
        self.current_player_seat = self.player_to_seat[winner_pid]
        return winner_pid

    def round_over(self) -> bool:
        return all(len(h) == 0 for h in self.hands.values())

    def compute_scores(self) -> dict[str, int]:
        return calculate_round_scores(self.bids, self.tricks_won)

    def _is_legal_play(self, player_id: str, card: str) -> bool:
        if is_wizard(card) or is_jester(card):
            return True
        if self.led_suit is None:
            return True
        hand = self.hands[player_id]
        has_led_suit = any(
            not is_wizard(c) and not is_jester(c) and get_suit(c) == self.led_suit
            for c in hand
        )
        if has_led_suit:
            return get_suit(card) == self.led_suit
        return True

    def _advance_seat(self):
        self.current_player_seat = (self.current_player_seat + 1) % self.num_players
