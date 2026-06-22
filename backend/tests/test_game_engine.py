import pytest
from app.services.deck import build_deck
from app.services.game_engine import GameState


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_game(num_players: int = 3, max_players: int = 3) -> GameState:
    gs = GameState("test-id", num_players, max_players)
    for i in range(num_players):
        gs.add_player(f"p{i}", i)
    return gs


def padded_deck(*leading_cards: str) -> list[str]:
    """Build a deck that starts with the given cards, padded to 60 with filler."""
    filler = [c for c in build_deck() if c not in leading_cards]
    return list(leading_cards) + filler[: 60 - len(leading_cards)]


# ---------------------------------------------------------------------------
# Player setup
# ---------------------------------------------------------------------------

class TestAddPlayer:
    def test_seat_and_player_maps_populated(self):
        gs = GameState("x", 2, 2)
        gs.add_player("alice", 0)
        gs.add_player("bob", 1)
        assert gs.seat_to_player[0] == "alice"
        assert gs.player_to_seat["bob"] == 1

    def test_tricks_won_initialised_to_zero(self):
        gs = GameState("x", 2, 2)
        gs.add_player("alice", 0)
        assert gs.tricks_won["alice"] == 0


# ---------------------------------------------------------------------------
# start_round
# ---------------------------------------------------------------------------

class TestStartRound:
    def test_hand_sizes_round1_three_players(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        assert all(len(h) == 1 for h in gs.hands.values())

    def test_hand_sizes_round3_three_players(self):
        gs = make_game(3)
        gs.start_round(3, 0)
        assert all(len(h) == 3 for h in gs.hands.values())

    def test_total_rounds_six_players(self):
        gs = make_game(6, 6)
        assert gs.total_rounds == 10  # 60 // 6

    def test_total_rounds_three_players(self):
        gs = GameState("x", 3, 3)
        assert gs.total_rounds == 20  # 60 // 3

    def test_trump_suit_from_regular_card(self):
        # Deck where trump card (index 3 for round 1 / 3 players) is a Heart
        deck = padded_deck("C2", "D3", "S4", "H7")
        gs = make_game(3)
        gs.start_round(1, 0, deck=deck)
        assert gs.trump_suit == "H"
        assert gs.trump_card == "H7"

    def test_wizard_flip_reflips_to_next_suited_card(self):
        # Wizard at the flip position is burned; the next suited card sets trump
        deck = padded_deck("C2", "D3", "S4", "W1", "H7")
        gs = make_game(3)
        gs.start_round(1, 0, deck=deck)
        assert gs.trump_suit == "H"
        assert gs.trump_card == "H7"

    def test_jester_flip_reflips_to_next_suited_card(self):
        deck = padded_deck("C2", "D3", "S4", "N1", "S9")
        gs = make_game(3)
        gs.start_round(1, 0, deck=deck)
        assert gs.trump_suit == "S"
        assert gs.trump_card == "S9"

    def test_multiple_specials_burned_until_suited(self):
        deck = padded_deck("C2", "D3", "S4", "W1", "N1", "W2", "D9")
        gs = make_game(3)
        gs.start_round(1, 0, deck=deck)
        assert gs.trump_suit == "D"
        assert gs.trump_card == "D9"

    def test_first_bidder_is_left_of_dealer(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        assert gs.current_player_seat == 1

    def test_first_bidder_wraps_around(self):
        gs = make_game(3)
        gs.start_round(1, 2)  # dealer at seat 2
        assert gs.current_player_seat == 0

    def test_bids_reset_each_round(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        gs.bids["p0"] = 1
        gs.start_round(2, 1)
        assert gs.bids == {}

    def test_tricks_won_reset_each_round(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        gs.tricks_won["p0"] = 5
        gs.start_round(2, 1)
        assert all(v == 0 for v in gs.tricks_won.values())


# ---------------------------------------------------------------------------
# Bidding
# ---------------------------------------------------------------------------

class TestBidding:
    def test_submit_bid_records_value(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        assert gs.submit_bid("p1", 1) is True
        assert gs.bids["p1"] == 1

    def test_cannot_bid_twice(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        gs.submit_bid("p1", 1)
        assert gs.submit_bid("p1", 0) is False
        assert gs.bids["p1"] == 1  # unchanged

    def test_all_bids_in_false_until_complete(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        gs.submit_bid("p1", 0)
        assert gs.all_bids_in() is False

    def test_all_bids_in_true_when_everyone_bid(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        for pid in ["p0", "p1", "p2"]:
            gs.submit_bid(pid, 0)
        assert gs.all_bids_in() is True


# ---------------------------------------------------------------------------
# Playing cards — legality
# ---------------------------------------------------------------------------

class TestPlayCard:
    def _setup_trick(self, gs: GameState, trump: str = "H") -> None:
        """Set controlled hands and trump for trick tests."""
        gs.trump_suit = trump
        gs.start_trick()

    def test_play_card_removes_from_hand(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        gs.start_trick()
        gs.trump_suit = "C"
        card = gs.hands["p0"][0]
        gs.play_card("p0", card)
        assert card not in gs.hands["p0"]

    def test_play_card_not_in_hand_returns_false(self):
        gs = make_game(3)
        gs.start_round(1, 0)
        gs.start_trick()
        assert gs.play_card("p0", "H2") is False or "H2" in gs.hands["p0"]

    def test_must_follow_led_suit(self):
        gs = make_game(3)
        gs.hands = {"p0": ["H5"], "p1": ["H9", "S3"], "p2": ["D2"]}
        gs.trump_suit = "C"
        gs.player_to_seat = {"p0": 0, "p1": 1, "p2": 2}
        gs.seat_to_player = {0: "p0", 1: "p1", 2: "p2"}
        gs.start_trick()

        gs.play_card("p0", "H5")  # leads Hearts
        # p1 has H9 so must play heart — S3 is illegal
        assert gs.play_card("p1", "S3") is False

    def test_can_play_any_when_no_led_suit_card(self):
        gs = make_game(3)
        gs.hands = {"p0": ["H5"], "p1": ["S3"], "p2": ["D2"]}
        gs.trump_suit = "C"
        gs.player_to_seat = {"p0": 0, "p1": 1, "p2": 2}
        gs.seat_to_player = {0: "p0", 1: "p1", 2: "p2"}
        gs.start_trick()

        gs.play_card("p0", "H5")  # leads Hearts
        # p1 has no Hearts — can play anything
        assert gs.play_card("p1", "S3") is True

    def test_wizard_exempt_from_follow_suit(self):
        gs = make_game(3)
        gs.hands = {"p0": ["H5"], "p1": ["H9", "W1"], "p2": ["D2"]}
        gs.trump_suit = "C"
        gs.player_to_seat = {"p0": 0, "p1": 1, "p2": 2}
        gs.seat_to_player = {0: "p0", 1: "p1", 2: "p2"}
        gs.start_trick()

        gs.play_card("p0", "H5")
        # p1 has H9 but can still play W1 (Wizard is always legal)
        assert gs.play_card("p1", "W1") is True

    def test_jester_exempt_from_follow_suit(self):
        gs = make_game(3)
        gs.hands = {"p0": ["H5"], "p1": ["H9", "N1"], "p2": ["D2"]}
        gs.trump_suit = "C"
        gs.player_to_seat = {"p0": 0, "p1": 1, "p2": 2}
        gs.seat_to_player = {0: "p0", 1: "p1", 2: "p2"}
        gs.start_trick()

        gs.play_card("p0", "H5")
        assert gs.play_card("p1", "N1") is True


# ---------------------------------------------------------------------------
# Trick resolution
# ---------------------------------------------------------------------------

class TestResolveTrick:
    def _play_trick(self, gs: GameState, plays: list[tuple[str, str]]) -> str:
        gs.start_trick()
        for pid, card in plays:
            gs.play_card(pid, card)
        return gs.resolve_trick()

    def _setup(self, hands: dict, trump: str) -> GameState:
        gs = make_game(len(hands), len(hands))
        players = list(hands.keys())
        gs.seat_to_player = {i: pid for i, pid in enumerate(players)}
        gs.player_to_seat = {pid: i for i, pid in enumerate(players)}
        gs.hands = hands
        gs.tricks_won = {pid: 0 for pid in players}
        gs.trump_suit = trump
        return gs

    def test_highest_led_suit_wins(self):
        gs = self._setup({"p0": ["H5"], "p1": ["H9"], "p2": ["H3"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "H5"), ("p1", "H9"), ("p2", "H3")])
        assert winner == "p1"

    def test_trump_beats_led_suit(self):
        gs = self._setup({"p0": ["H5"], "p1": ["C2"], "p2": ["H9"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "H5"), ("p1", "C2"), ("p2", "H9")])
        assert winner == "p1"

    def test_higher_trump_beats_lower_trump(self):
        gs = self._setup({"p0": ["H5"], "p1": ["C2"], "p2": ["CK"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "H5"), ("p1", "C2"), ("p2", "CK")])
        assert winner == "p2"

    def test_wizard_beats_everything(self):
        gs = self._setup({"p0": ["W1"], "p1": ["CA"], "p2": ["W2"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "W1"), ("p1", "CA"), ("p2", "W2")])
        assert winner == "p0"  # first Wizard wins

    def test_second_wizard_loses_to_first(self):
        gs = self._setup({"p0": ["H5"], "p1": ["W1"], "p2": ["W2"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "H5"), ("p1", "W1"), ("p2", "W2")])
        assert winner == "p1"  # W1 played first

    def test_jester_loses_to_any_regular_card(self):
        gs = self._setup({"p0": ["N1"], "p1": ["H2"], "p2": ["N2"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "N1"), ("p1", "H2"), ("p2", "N2")])
        assert winner == "p1"

    def test_all_jesters_first_player_wins(self):
        gs = self._setup({"p0": ["N1"], "p1": ["N2"], "p2": ["N3"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "N1"), ("p1", "N2"), ("p2", "N3")])
        assert winner == "p0"  # first Jester played

    def test_off_suit_card_does_not_beat_led_suit(self):
        gs = self._setup({"p0": ["H5"], "p1": ["S9"], "p2": ["H3"]}, trump="none")
        winner = self._play_trick(gs, [("p0", "H5"), ("p1", "S9"), ("p2", "H3")])
        assert winner == "p0"  # H5 wins; S9 is off-suit and irrelevant

    def test_winner_seat_updated(self):
        gs = self._setup({"p0": ["H5"], "p1": ["H9"], "p2": ["H3"]}, trump="C")
        winner = self._play_trick(gs, [("p0", "H5"), ("p1", "H9"), ("p2", "H3")])
        assert gs.current_player_seat == gs.player_to_seat[winner]

    def test_tricks_won_incremented(self):
        gs = self._setup({"p0": ["H5"], "p1": ["H9"], "p2": ["H3"]}, trump="C")
        self._play_trick(gs, [("p0", "H5"), ("p1", "H9"), ("p2", "H3")])
        assert gs.tricks_won["p1"] == 1
        assert gs.tricks_won["p0"] == 0


# ---------------------------------------------------------------------------
# Round over & scoring
# ---------------------------------------------------------------------------

class TestRoundOverAndScoring:
    def test_round_not_over_with_cards_remaining(self):
        gs = make_game(3)
        gs.start_round(2, 0)
        assert gs.round_over() is False

    def test_round_over_when_all_hands_empty(self):
        gs = make_game(3)
        gs.hands = {"p0": [], "p1": [], "p2": []}
        assert gs.round_over() is True

    def test_compute_scores_delegates_to_scoring(self):
        gs = make_game(3)
        gs.bids = {"p0": 1, "p1": 0, "p2": 2}
        gs.tricks_won = {"p0": 1, "p1": 1, "p2": 1}
        scores = gs.compute_scores()
        assert scores["p0"] == 30   # correct: 20 + 10*1
        assert scores["p1"] == -10  # wrong: -10 * |0-1|
        assert scores["p2"] == -10  # wrong: -10 * |2-1|
