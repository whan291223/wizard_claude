import pytest
from app.services.deck import (
    SUITS, RANKS,
    build_deck, shuffle_deck, deal,
    is_wizard, is_jester, get_suit, get_rank_value,
)


class TestBuildDeck:
    def test_deck_has_60_cards(self):
        assert len(build_deck()) == 60

    def test_deck_has_52_regular_cards(self):
        deck = build_deck()
        regular = [c for c in deck if not is_wizard(c) and not is_jester(c)]
        assert len(regular) == 52

    def test_deck_has_4_wizards(self):
        deck = build_deck()
        assert sum(1 for c in deck if is_wizard(c)) == 4

    def test_deck_has_4_jesters(self):
        deck = build_deck()
        assert sum(1 for c in deck if is_jester(c)) == 4

    def test_deck_has_no_duplicates(self):
        deck = build_deck()
        assert len(deck) == len(set(deck))

    def test_all_suits_present(self):
        deck = build_deck()
        regular = [c for c in deck if not is_wizard(c) and not is_jester(c)]
        for suit in SUITS:
            assert sum(1 for c in regular if c[0] == suit) == 13

    def test_all_ranks_present_per_suit(self):
        deck = build_deck()
        regular = [c for c in deck if not is_wizard(c) and not is_jester(c)]
        for suit in SUITS:
            suit_cards = [c[1:] for c in regular if c[0] == suit]
            assert sorted(suit_cards) == sorted(RANKS)


class TestShuffleDeck:
    def test_shuffle_returns_same_cards(self):
        deck = build_deck()
        shuffled = shuffle_deck(deck)
        assert sorted(shuffled) == sorted(deck)

    def test_shuffle_does_not_mutate_original(self):
        deck = build_deck()
        original = deck.copy()
        shuffle_deck(deck)
        assert deck == original

    def test_shuffle_changes_order(self):
        deck = build_deck()
        # Extremely unlikely to produce same order
        results = [shuffle_deck(deck) for _ in range(5)]
        assert not all(r == deck for r in results)


class TestIsWizard:
    def test_wizard_cards(self):
        for i in range(1, 5):
            assert is_wizard(f"W{i}") is True

    def test_regular_cards_not_wizard(self):
        assert is_wizard("H7") is False
        assert is_wizard("SA") is False
        assert is_wizard("C10") is False

    def test_jester_not_wizard(self):
        assert is_wizard("N1") is False


class TestIsJester:
    def test_jester_cards(self):
        for i in range(1, 5):
            assert is_jester(f"N{i}") is True

    def test_regular_cards_not_jester(self):
        assert is_jester("H7") is False
        assert is_jester("SA") is False

    def test_wizard_not_jester(self):
        assert is_jester("W1") is False


class TestGetSuit:
    def test_regular_card_suit(self):
        assert get_suit("H7") == "H"
        assert get_suit("SA") == "S"
        assert get_suit("C10") == "C"
        assert get_suit("DK") == "D"

    def test_wizard_has_no_suit(self):
        assert get_suit("W1") is None
        assert get_suit("W4") is None

    def test_jester_has_no_suit(self):
        assert get_suit("N1") is None
        assert get_suit("N3") is None


class TestGetRankValue:
    def test_numeric_ranks(self):
        assert get_rank_value("H2") == 2
        assert get_rank_value("C9") == 9
        assert get_rank_value("D10") == 10

    def test_face_ranks(self):
        assert get_rank_value("SJ") == 11
        assert get_rank_value("HQ") == 12
        assert get_rank_value("CK") == 13
        assert get_rank_value("DA") == 14

    def test_ace_is_highest(self):
        assert get_rank_value("HA") > get_rank_value("HK")

    def test_special_cards_rank_zero(self):
        assert get_rank_value("W1") == 0
        assert get_rank_value("N2") == 0


class TestDeal:
    def test_deal_round1_three_players(self):
        deck = build_deck()
        hands, trump = deal(deck, 3, 1)
        assert len(hands) == 3
        assert all(len(h) == 1 for h in hands)
        assert trump == deck[3]

    def test_deal_round3_four_players(self):
        deck = build_deck()
        hands, trump = deal(deck, 4, 3)
        assert len(hands) == 4
        assert all(len(h) == 3 for h in hands)
        assert trump == deck[12]

    def test_deal_uses_deck_in_order(self):
        deck = [f"C{r}" for r in RANKS] + ["W1"] * 10 + ["N1"] * 10
        hands, trump = deal(deck, 2, 3)
        # 2 players × 3 rounds = 6 cards dealt, trump is index 6
        assert trump == deck[6]
        assert hands[0] == [deck[0], deck[2], deck[4]]
        assert hands[1] == [deck[1], deck[3], deck[5]]

    def test_deal_no_trump_when_deck_exhausted(self):
        # Exactly 60 cards dealt to 6 players for 10 rounds — no card left for trump
        deck = build_deck()
        hands, trump = deal(deck, 6, 10)
        assert trump is None
        assert all(len(h) == 10 for h in hands)
