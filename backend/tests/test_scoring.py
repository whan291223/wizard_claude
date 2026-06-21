import pytest
from app.services.scoring import calculate_round_scores


class TestCalculateRoundScores:
    def test_correct_bid_zero(self):
        scores = calculate_round_scores({"p0": 0}, {"p0": 0})
        assert scores["p0"] == 20  # 20 + 10*0

    def test_correct_bid_one(self):
        scores = calculate_round_scores({"p0": 1}, {"p0": 1})
        assert scores["p0"] == 30  # 20 + 10*1

    def test_correct_bid_three(self):
        scores = calculate_round_scores({"p0": 3}, {"p0": 3})
        assert scores["p0"] == 50  # 20 + 10*3

    def test_wrong_bid_over_by_one(self):
        scores = calculate_round_scores({"p0": 2}, {"p0": 3})
        assert scores["p0"] == -10  # -10 * |2-3|

    def test_wrong_bid_under_by_two(self):
        scores = calculate_round_scores({"p0": 3}, {"p0": 1})
        assert scores["p0"] == -20  # -10 * |3-1|

    def test_bid_zero_win_one(self):
        scores = calculate_round_scores({"p0": 0}, {"p0": 1})
        assert scores["p0"] == -10

    def test_missing_tricks_counts_as_zero(self):
        scores = calculate_round_scores({"p0": 0}, {})
        assert scores["p0"] == 20

    def test_multiple_players_mixed_results(self):
        bids = {"p0": 2, "p1": 1, "p2": 0}
        won = {"p0": 2, "p1": 0, "p2": 0}
        scores = calculate_round_scores(bids, won)
        assert scores["p0"] == 40   # correct: 20 + 10*2
        assert scores["p1"] == -10  # wrong: -10 * |1-0|
        assert scores["p2"] == 20   # correct: 20 + 10*0

    def test_all_players_correct(self):
        bids = {"p0": 1, "p1": 2, "p2": 0}
        won = {"p0": 1, "p1": 2, "p2": 0}
        scores = calculate_round_scores(bids, won)
        assert scores["p0"] == 30
        assert scores["p1"] == 40
        assert scores["p2"] == 20
