class_name Minigames
extends RefCounted
## story/minigames.js: blackjack, street combat, the horse track and snake.
## Payouts, ceilings and odds are the original's, and so is the money cap:
## money is ten bits of the save code.

const CARD_SUITS := ["♠", "♥", "♦", "♣"]
const CARD_RANKS := ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
const CROOK_NAMES := ["a greasy pickpocket", "a mean-looking brawler", "a twitchy junkie", "a fat bookie with a bat", "a skinny knife-kid", "a crooked ex-cop"]
const HORSE_FIRST := ["Biscuit", "Bolt", "Dudley", "Mister", "Grandpa", "Lightning", "Wobble", "Duchess", "Tiny", "Fats", "Lucky", "Hambone"]
const HORSE_LAST := ["Thunderpants", "Galloway", "McFast", "O'Clomp", "Von Neigh", "Hoofington", "Jr.", "the Third", "Disaster", "Pickles", "Bones", "Maximus"]

var t: Node
var S: Node


func _init(terminal: Node) -> void:
	t = terminal
	S = GameState


## tools: a value in [0, 1) that every roll returns instead of randf(), to
## match the browser run with Math.random pinned to the same number
static var fixed_random := -1.0


static func _rand() -> float:
	return fixed_random if fixed_random >= 0.0 else randf()


static func _rand_int(n: int) -> int:
	return int(floor(_rand() * n))


static func build_deck() -> Array:
	var deck: Array = []
	for s in 4:
		for r in 13:
			deck.append({"rank": CARD_RANKS[r], "suit": CARD_SUITS[s]})
	for i in range(deck.size() - 1, 0, -1):
		var j := _rand_int(i + 1)
		var tmp: Variant = deck[i]
		deck[i] = deck[j]
		deck[j] = tmp
	return deck


static func hand_value(cards: Array) -> int:
	var total := 0
	var aces := 0
	for c in cards:
		var r: String = c["rank"]
		if r == "A":
			total += 11
			aces += 1
		elif r == "K" or r == "Q" or r == "J":
			total += 10
		else:
			total += int(r)
	while total > 21 and aces > 0:
		total -= 10
		aces -= 1
	return total


## showCardHand(cards, hideSecond): a `.line` of inline-block cards.
func show_card_hand(cards: Array, hide_second: bool) -> void:
	var row := HFlowContainer.new()
	row.alignment = FlowContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("h_separation", 0)
	row.add_theme_constant_override("v_separation", 0)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for i in cards.size():
		row.add_child(_card(cards[i], hide_second and i == 1))
	t.append_node(row)


## createCardEl(card, hidden): 60x88, 2px amber border, radius 5, #1a1a0e,
## margin 0 3px 4px, Share Tech Mono 14px amber with glow.
func _card(card: Dictionary, hidden: bool) -> Control:
	var outer := MarginContainer.new()
	outer.add_theme_constant_override("margin_left", 3)
	outer.add_theme_constant_override("margin_right", 3)
	outer.add_theme_constant_override("margin_bottom", 4)
	outer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var box := Control.new()
	box.custom_minimum_size = Vector2(60, 88)
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.draw.connect(func() -> void:
		var sb := Css.glow(Css.box(Color("#1a1a0e"), Css.AMBER, 2, 5), Css.rgba(255, 176, 0, 0.3), 6)
		Css.draw_box(box, Rect2(Vector2.ZERO, box.size), sb))
	outer.add_child(box)
	var mono := Css.font("mono")
	if hidden:
		var q := CrtText.new()
		q.font = mono
		q.font_size = 18
		q.line_height = 18 * 1.15
		q.color = Css.GREEN
		q.glows = [[6.0, Css.GREEN]]
		q.text = "?"
		q.position = Vector2(4, 4 + (88.0 / 2.0 - 14.0))
		q.size = Vector2(52, 21)
		box.add_child(q)
		return outer
	var red: bool = card["suit"] == "♥" or card["suit"] == "♦"
	var suit_color := Color("#ff4444") if red else Css.GREEN
	var top := CrtText.new()
	top.font = mono
	top.font_size = 14
	top.line_height = 14 * 1.15
	top.color = Css.AMBER
	top.glows = [[4.0, Css.AMBER]]
	top.align = CrtText.Align.LEFT
	top.wrap = false
	top.text = card["rank"]
	top.position = Vector2(4, 4)
	top.size = Vector2(52, 16.1)
	box.add_child(top)
	var pip := CrtText.new()
	pip.font = mono
	pip.font_size = 20
	pip.line_height = 20 * 1.15
	pip.color = suit_color
	pip.glows = [[6.0, suit_color]]
	pip.wrap = false
	pip.text = card["suit"]
	pip.position = Vector2(4, 4 + 16.1 + 10)
	pip.size = Vector2(52, 23)
	box.add_child(pip)
	var bot := CrtText.new()
	bot.font = mono
	bot.font_size = 14
	bot.line_height = 14 * 1.15
	bot.color = Css.AMBER
	bot.glows = [[4.0, Css.AMBER]]
	bot.align = CrtText.Align.RIGHT
	bot.wrap = false
	bot.text = card["rank"]
	bot.position = Vector2(4, 4 + 16.1 + 10 + 23)
	bot.size = Vector2(52, 16.1)
	box.add_child(bot)
	return outer


func play_blackjack() -> void:
	t.section("ILLEGAL BLACKJACK  ·  GUMSHOE TAVERN")
	await t.type_line('"The back room stinks of smoke and old bourbon. A dealer nods at you."', "narration")
	await t.type_line('Dealer: "Sit down, detective. House rules. Max bet $50. Dealer stands on 17."', "speaker")
	t.blank()
	var hands_played := 0
	while true:
		if t.ended:
			return
		t.show_status()
		if S.money <= 0:
			await t.type_line('"You\'re out of cash. The dealer waves you off."', "narration")
			return
		if S.money >= 1000:
			S.secret_ending = true
			await t.type_line('"The dealer stares at your stack. \'...Get out. You\'re done here.\'"', "speaker")
			await t.type_line('"You pocket a thousand dollars and stagger out grinning."', "narration")
			return
		var prompt := "Do you want to play a hand?" if hands_played == 0 else "Do you want to play another hand?"
		var choice: Dictionary = await t.ask_click(prompt, [
			{"keys": ["p", "play", "y"], "label": "PLAY"},
			{"keys": ["e", "exit", "n"], "label": "EXIT"},
		])
		if (choice["keys"] as Array).has("e"):
			return
		hands_played += 1
		var max_bet := mini(50, S.money)
		var bet: int = await t.ask_number("Place your bet", 1, max_bet)
		S.money -= bet
		var deck := build_deck()
		var player: Array = [deck.pop_back(), deck.pop_back()]
		var dealer: Array = [deck.pop_back(), deck.pop_back()]
		t.blank()
		t.instant_line("DEALER:", "sys")
		show_card_hand(dealer, true)
		t.instant_line("YOU:", "sys")
		show_card_hand(player, false)
		t.instant_line("  Your total: " + str(hand_value(player)), "sys")
		while hand_value(player) < 21:
			var act: Dictionary = await t.ask_click("Hit or Stand?", [
				{"keys": ["h", "hit"], "label": "HIT"},
				{"keys": ["s", "stand"], "label": "STAND"},
			])
			if (act["keys"] as Array).has("h"):
				player.append(deck.pop_back())
				t.blank()
				t.instant_line("YOU:", "sys")
				show_card_hand(player, false)
				t.instant_line("  Your total: " + str(hand_value(player)), "sys")
			else:
				break
		if hand_value(player) > 21:
			await t.type_line('"BUST! The dealer rakes your chips."', "err")
			continue
		t.blank()
		t.instant_line("DEALER REVEALS:", "sys")
		show_card_hand(dealer, false)
		while hand_value(dealer) < 17:
			await t.sleep(600)
			dealer.append(deck.pop_back())
			t.blank()
			t.instant_line("DEALER:", "sys")
			show_card_hand(dealer, false)
		var dv := hand_value(dealer)
		var pv := hand_value(player)
		t.instant_line("  Dealer: " + str(dv) + "  ·  You: " + str(pv), "sys")
		if dv > 21 or pv > dv:
			S.money = mini(1023, S.money + bet * 2)
			await t.type_line('"YOU WIN! +$' + str(bet) + '"', "speaker")
		elif dv == pv:
			S.money = mini(1023, S.money + bet)
			await t.type_line('"Push. Bet returned."', "narration")
		else:
			await t.type_line('"Dealer wins. -$' + str(bet) + '"', "err")


func rps_combat() -> void:
	var crook: String = CROOK_NAMES[_rand_int(CROOK_NAMES.size())]
	t.section("RANDOM ENCOUNTER")
	await t.type_line('"From the shadows steps ' + crook + '."', "narration")
	var parts := crook.split(" ")
	await t.type_line(parts[parts.size() - 1].to_upper() + ': "Wallet. NOW."', "speaker")
	t.blank()
	var cliveman_hp := 3
	var crook_hp := 3
	var moves := {"punch": {"name": "PUNCH", "beats": "slap"}, "kick": {"name": "KICK", "beats": "punch"}, "slap": {"name": "SLAP", "beats": "kick"}}
	var move_keys := ["punch", "kick", "slap"]
	while cliveman_hp > 0 and crook_hp > 0:
		if t.ended:
			return
		t.instant_line("  YOU: " + "♥".repeat(cliveman_hp) + "   CROOK: " + "♥".repeat(crook_hp), "sys")
		var choice: Dictionary = await t.ask_click("Your move?", [
			{"keys": ["p", "punch"], "label": "PUNCH (rock)"},
			{"keys": ["k", "kick"], "label": "KICK (paper)"},
			{"keys": ["s", "slap"], "label": "SLAP (scissors)"},
		])
		var player_move := "slap"
		if (choice["keys"] as Array).has("p"):
			player_move = "punch"
		elif (choice["keys"] as Array).has("k"):
			player_move = "kick"
		var crook_move: String = move_keys[_rand_int(3)]
		await t.type_line("You " + moves[player_move]["name"] + ". Crook " + moves[crook_move]["name"] + "s.", "narration")
		if player_move == crook_move:
			await t.type_line('"You both bounce off each other. No damage."', "narration")
		elif moves[player_move]["beats"] == crook_move:
			crook_hp -= 1
			await t.type_line('"CLEAN HIT! Crook staggers."', "speaker")
		else:
			cliveman_hp -= 1
			await t.type_line('"OOF. He got you."', "err")
	if cliveman_hp <= 0:
		await t.type_line('"The crook rifles through your pockets and bolts. You lose everything."', "err")
		var loss := mini(20, S.money)
		S.money -= loss
		return
	S.enemies_beat += 1
	var reward := 1 + _rand_int(50)
	S.money = mini(1023, S.money + reward)
	await t.type_line('"Crook apprehended. You gained $' + str(reward) + '. You are level ' + str(S.level) + '."', "sys")
	if t.level_up_check():
		await t.type_line('"You leveled up! You are now Level: ' + str(S.level) + '"', "speaker")


static func gen_horse_name() -> String:
	return HORSE_FIRST[_rand_int(HORSE_FIRST.size())] + " " + HORSE_LAST[_rand_int(HORSE_LAST.size())]


func play_horse_race() -> void:
	t.section("DUDLEY MILLS HORSE TRACK")
	await t.type_line('"The track smells like manure and broken dreams. Four horses are lined up."', "narration")
	t.blank()
	while true:
		if t.ended:
			return
		t.show_status()
		if S.money <= 0:
			await t.type_line('"You\'re broke. The bookie laughs you out."', "narration")
			return
		var horses: Array = []
		for i in 4:
			horses.append({"name": gen_horse_name(), "pos": 0})
		t.instant_line("TODAY'S LINEUP:", "sys")
		for i in 4:
			t.instant_line("  " + str(i + 1) + ". " + horses[i]["name"], "speaker")
		t.blank()
		var opts: Array = []
		for i in 4:
			opts.append({"keys": [str(i + 1)], "label": str(i + 1) + ": " + horses[i]["name"]})
		opts.append({"keys": ["e", "exit"], "label": "EXIT TRACK"})
		var choice: Dictionary = await t.ask_click("Pick your horse (or exit)", opts)
		if (choice["keys"] as Array).has("e"):
			return
		var pick := int(choice["keys"][0]) - 1
		var max_bet := mini(60, S.money)
		var bet: int = await t.ask_number("Place your bet", 1, max_bet)
		S.money -= bet
		var frozen := _rand_int(4) if _rand() < (1.0 / 1200.0) else -1
		t.blank()
		await t.type_line('"AND THEY\'RE OFF!"', "speaker")
		t.blank()
		var divs := [t.append_line("car"), t.append_line("car"), t.append_line("car"), t.append_line("car")]
		const FINISH := 30
		var render := func() -> void:
			for i in 4:
				var p: int = mini(FINISH, horses[i]["pos"])
				var track := " ".repeat(p) + ">o-" + " ".repeat(maxi(0, FINISH - p)) + "|"
				var nm: String = String(horses[i]["name"]).substr(0, 14).rpad(14)
				divs[i].text = str(i + 1) + " " + nm + " " + track
		render.call()
		while true:
			var any_done := false
			for i in 4:
				if i == frozen:
					continue
				horses[i]["pos"] += _rand_int(3)
				if horses[i]["pos"] >= FINISH:
					any_done = true
			render.call()
			await t.sleep(180)
			if any_done:
				break
		var winner := 0
		for i in range(1, 4):
			if horses[i]["pos"] > horses[winner]["pos"]:
				winner = i
		t.blank()
		await t.type_line('"WINNER: ' + horses[winner]["name"] + '!"', "speaker")
		if winner == pick:
			var payout := bet * 3
			S.money = mini(1023, S.money + payout)
			await t.type_line('"YOUR HORSE WON! +$' + str(payout) + '"', "sys")
		else:
			if frozen == pick:
				await t.type_line('"...Your horse never moved. At all. The crowd laughs."', "err")
			else:
				await t.type_line('"Your horse lost. Better luck next race."', "err")
		t.blank()


func play_snake() -> void:
	t.section("DUDLEY ARCADE  ·  SNAKE")
	if S.money < 1:
		await t.type_line('"You don\'t have a dollar to play. Come back later."', "err")
		return
	S.money -= 1
	await t.type_line('"You drop a dollar in. The machine beeps. Score 100 for $100 payout."', "sys")
	t.show_status()
	t.blank()
	const W := 20
	const H := 10
	var snake: Array = [[5, 5], [5, 4], [5, 3]]
	var dir := [0, 1]
	var food := [_rand_int(H), _rand_int(W)]
	var score := 0
	var game_over := false
	var pending: Array = []
	var board: CrtText = t.append_line("ascii")
	var score_div: CrtText = t.append_line("sys")
	var draw := func() -> void:
		var grid: Array = []
		for r in H:
			var row: Array = []
			for c in W:
				row.append(" ")
			grid.append(row)
		for i in snake.size():
			var s: Array = snake[i]
			if s[0] >= 0 and s[0] < H and s[1] >= 0 and s[1] < W:
				grid[s[0]][s[1]] = "@" if i == 0 else "o"
		if food[0] >= 0 and food[0] < H and food[1] >= 0 and food[1] < W:
			grid[food[0]][food[1]] = "*"
		var out := "+" + "-".repeat(W) + "+\n"
		for r in H:
			out += "|" + "".join(grid[r]) + "|\n"
		out += "+" + "-".repeat(W) + "+"
		board.text = out
		score_div.text = "  SCORE: " + str(score)
	draw.call()
	var exit_flag := [false]
	var handle_dir := func(d: String) -> void:
		var nd: Array
		match d:
			"up": nd = [-1, 0]
			"down": nd = [1, 0]
			"left": nd = [0, -1]
			"right": nd = [0, 1]
			_: return
		if nd[0] == -dir[0] and nd[1] == -dir[1]:
			return
		pending.clear()
		pending.append(nd)
	var prev_check: Callable = t.check_fn
	var prev_move: bool = t.movement_allowed
	t.snake_handler = handle_dir
	t.check_fn = func() -> void: exit_flag[0] = true
	t.set_movement_allowed(true)
	while not game_over and not exit_flag[0]:
		await t.sleep(220)
		if t.ended:
			break
		if not pending.is_empty():
			dir = pending[0]
			pending.clear()
		var head := [snake[0][0] + dir[0], snake[0][1] + dir[1]]
		if head[0] < 0 or head[0] >= H or head[1] < 0 or head[1] >= W:
			game_over = true
			break
		for i in snake.size():
			if snake[i][0] == head[0] and snake[i][1] == head[1]:
				game_over = true
				break
		if game_over:
			break
		snake.insert(0, head)
		if head[0] == food[0] and head[1] == food[1]:
			score += 10
			while true:
				food = [_rand_int(H), _rand_int(W)]
				var collision := false
				for i in snake.size():
					if snake[i][0] == food[0] and snake[i][1] == food[1]:
						collision = true
						break
				if not collision:
					break
		else:
			snake.pop_back()
		draw.call()
		if t.is_autoplay():
			break
	t.snake_handler = Callable()
	t.check_fn = prev_check
	t.set_movement_allowed(prev_move)
	t.blank()
	if score >= 100:
		S.money += 100
		await t.type_line('"HIGH SCORE! +$100 payout!"', "sys")
	else:
		await t.type_line('"GAME OVER. Final score: ' + str(score) + '"', "err")
