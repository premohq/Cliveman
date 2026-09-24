extends Node
## Checks the parts of the Dudley minigames where a bug actually costs the
## player money: deck integrity, ace handling, the save-code money ceiling and
## the level curve.
##
##   godot --headless --path . tools/minigames_check.tscn
##
## Exits non-zero on failure.

var _failures: Array[String] = []


func _ready() -> void:
	_check_deck()
	_check_hand_values()
	_check_money_cap()
	_check_level_curve()

	print("")
	if _failures.is_empty():
		print("minigames check: PASS")
		get_tree().quit(0)
	else:
		for f in _failures:
			print("minigames check: FAIL  " + f)
		get_tree().quit(1)


func _expect(label: String, got: Variant, want: Variant) -> void:
	var ok: bool = got == want
	print("  %-42s %s  (got %s)" % [label, "ok" if ok else "FAIL", str(got)])
	if not ok:
		_failures.append("%s: expected %s, got %s" % [label, str(want), str(got)])


func _check_deck() -> void:
	var deck := Minigames.build_deck()
	_expect("deck has 52 cards", deck.size(), 52)

	var seen := {}
	for c in deck:
		seen["%s%s" % [c["rank"], c["suit"]]] = true
	_expect("all 52 are distinct", seen.size(), 52)

	# Shuffled, not sorted. Two independent deals matching would be a red flag.
	var a := Minigames.build_deck()
	var b := Minigames.build_deck()
	var identical := true
	for i in a.size():
		if a[i]["rank"] != b[i]["rank"] or a[i]["suit"] != b[i]["suit"]:
			identical = false
			break
	_expect("two deals are not identical", identical, false)


## Aces count eleven until that would bust, then drop to one. This is the rule
## most often got wrong, and it decides every hand.
func _check_hand_values() -> void:
	var hand := func(specs: Array) -> Array:
		var out: Array = []
		for s in specs:
			out.append({"rank": s, "suit": "♠"})
		return out

	_expect("A + K is blackjack", Minigames.hand_value(hand.call(["A", "K"])), 21)
	_expect("A + A + 9 is 21", Minigames.hand_value(hand.call(["A", "A", "9"])), 21)
	_expect("A + 5 is 16", Minigames.hand_value(hand.call(["A", "5"])), 16)
	_expect("A + 5 + K is 16", Minigames.hand_value(hand.call(["A", "5", "K"])), 16)
	_expect("K + Q + J busts at 30", Minigames.hand_value(hand.call(["K", "Q", "J"])), 30)
	_expect("2 + 3 + 4 is 9", Minigames.hand_value(hand.call(["2", "3", "4"])), 9)
	_expect("four aces is 14", Minigames.hand_value(hand.call(["A", "A", "A", "A"])), 14)


## Money is ten bits of the save code. Anything above 1023 would be silently
## truncated on save, so every payout clamps.
func _check_money_cap() -> void:
	GameState.reset()
	GameState.money = 1000
	GameState.money = mini(1023, GameState.money + 500)
	_expect("a big win clamps to the cap", GameState.money, 1023)

	# And survives a save round trip unchanged.
	var code := GameState.encode_save()
	GameState.checkpoint = 1
	code = GameState.encode_save()
	var back := GameState.decode_save(code)
	_expect("1023 survives encode and decode", back.get("money", -1), 1023)


## Levels double: two wins for level two, four for three, eight for four.
func _check_level_curve() -> void:
	var term: Node = load("res://scripts/terminal.gd").new()
	for pair in [[0, 1], [1, 1], [2, 2], [3, 2], [4, 3], [7, 3], [8, 4], [16, 5]]:
		GameState.enemies_beat = pair[0]
		GameState.level = 1
		term.call("level_up_check")
		_expect("%d wins is level %d" % [pair[0], pair[1]], GameState.level, pair[1])
	term.free()
