def calculate_round_scores(
    bids: dict[str, int],
    tricks_won: dict[str, int],
) -> dict[str, int]:
    scores: dict[str, int] = {}
    for player_id, bid in bids.items():
        won = tricks_won.get(player_id, 0)
        if bid == won:
            scores[player_id] = 20 + (10 * won)
        else:
            scores[player_id] = -10 * abs(bid - won)
    return scores
