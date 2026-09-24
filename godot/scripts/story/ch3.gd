class_name Ch3
extends RefCounted
## story/ch3.js: central Dudley, chapter three, the epilogue, and runFrom(),
## the checkpoint dispatcher that both a new game and a loaded save go through.

const ROOM_DUDLEY := 10
const DUDLEY_BEVAN_LINES := [
	'Bevan: "I\'m still so wasted, Cliveman."',
	'Bevan: "I miss my wife. I miss her so much."',
	'Bevan: "Clive, I am STARVING."',
	'Bevan: "That sub shop feels like it\'s on another continent."',
	'Bevan: "How many miles is a mile again?"',
	'Bevan: "My feet hurt. My soul hurts."',
	'Bevan: "I wonder if Karen still thinks about me."',
	'Bevan: "I would kill a man for a meatball sub right now."',
]

var t: Node
var S: Node
var c1: Ch1
var c2: Ch2
var mg: Minigames


func _init(terminal: Node, ch1: Ch1, ch2: Ch2, games: Minigames) -> void:
	t = terminal
	S = GameState
	c1 = ch1
	c2 = ch2
	mg = games


func ch2_dudley_open_world() -> void:
	S.checkpoint = 6
	t.section("CENTRAL DUDLEY")
	await t.type_line('"You hit the main drag. Neon signs flicker above you. A tavern, an arcade, the old horse track... and the mechanic behind you, arms crossed, waiting for his money."', "narration")
	await t.type_line('"You need $250. You have $' + str(S.money) + '. Get moving."', "sys")
	t.blank()
	var grid := NavGrid.from_rows([
		[".", ".", "G", ".", "#", ".", "H", "."],
		[".", ".", ".", ".", "#", ".", ".", "."],
		[".", "#", ".", ".", ".", ".", "#", "."],
		["M", ".", ".", ".", "A", ".", ".", "."],
	])
	var events := {}
	events["0,2"] = func() -> Variant:
		await t.type_line('"You step into the GUMSHOE TAVERN. The lights are low. The bartender nods toward a back room."', "narration")
		var c: Dictionary = await t.ask_click("Play illegal blackjack?", [
			{"keys": ["y", "yes", "play"], "label": "PLAY BLACKJACK"},
			{"keys": ["n", "no", "leave"], "label": "LEAVE"},
		])
		if (c["keys"] as Array).has("y"):
			await mg.play_blackjack()
		return null
	events["0,6"] = func() -> Variant:
		await t.type_line('"You arrive at DUDLEY MILLS HORSE TRACK. The air smells like sweat and cigarettes."', "narration")
		var c: Dictionary = await t.ask_click("Bet on the horses?", [
			{"keys": ["y", "yes", "play"], "label": "BET ON HORSES"},
			{"keys": ["n", "no", "leave"], "label": "LEAVE"},
		])
		if (c["keys"] as Array).has("y"):
			await mg.play_horse_race()
		return null
	events["3,4"] = func() -> Variant:
		await t.type_line('"You enter the DUDLEY ARCADE. Kids crowd around a Snake machine."', "narration")
		var c: Dictionary = await t.ask_click("Play Snake? ($1)", [
			{"keys": ["y", "yes", "play"], "label": "PLAY SNAKE"},
			{"keys": ["n", "no", "leave"], "label": "LEAVE"},
		])
		if (c["keys"] as Array).has("y"):
			await mg.play_snake()
		return null
	events["3,0"] = func() -> Variant:
		await t.type_line('"The mechanic looks up from a greasy rag."', "narration")
		if S.money >= 250:
			var c: Dictionary = await t.ask_click("Pay the mechanic $250 and leave town?", [
				{"keys": ["y", "yes", "pay"], "label": "PAY $250 AND LEAVE"},
				{"keys": ["n", "no", "wait"], "label": "NOT YET"},
			])
			if (c["keys"] as Array).has("y"):
				S.money -= 250
				S.mechanic_paid = true
				await t.type_line('Mechanic: "$250. Right on the nose. Your Buick\'s purring again."', "speaker")
				await t.type_line('"He tosses you the keys. Bevan applauds weakly."', "narration")
				return "leave_dudley"
			else:
				await t.type_line('Mechanic: "Suit yourself. I\'ll be here."', "speaker")
		else:
			await t.type_line('Mechanic: "You\'re still short. You\'ve got $' + str(S.money) + '. Come back with $250 or don\'t come back at all."', "speaker")
		return null
	var exits := {}
	var gate := func(_code: String) -> bool:
		return true
	var on_move := func(pos: Array) -> void:
		if randf() < 0.2:
			var line: String = DUDLEY_BEVAN_LINES[int(floor(randf() * DUDLEY_BEVAN_LINES.size()))]
			await t.type_line(line, "speaker")
		var key := "%d,%d" % [pos[0], pos[1]]
		if events.has(key):
			return
		if randf() < 0.067:
			t.nav_suspend()
			await mg.rps_combat()
			t.nav_resume()
	await t.navigate_room(ROOM_DUDLEY, grid, [3, 0], events, exits, {
		"title": "CENTRAL DUDLEY",
		"exitGate": gate,
		"onMove": on_move,
	})


func ch3() -> void:
	t.section("C H A P T E R   3   -   B E G I N S")
	var evidence := [
		'"The official investigation into the death of Detective Sergeant Harrison Bevan begins at 6 AM."',
		'"The coroner confirms it: anaphylaxis, induced by a foreign compound worked into the mayonnaise. Not an allergy. Not an accident. Something added. Something engineered."',
		'"By 9 AM the lab has matched that compound to trace residue found in the lining of your coat pocket."',
		'"You have never seen it. You cannot explain it. You were wearing that coat when they cuffed you."',
		'"Your own blood comes back with the same compound in it - a smaller dose, but there. You tell them what it means: someone dosed you too, that is why you couldn\'t think straight, that is why you don\'t remember the badge number. They write it down as self-administered. Of course they do. A guilty man would say exactly that."',
	]
	for i in evidence.size():
		await t.type_line(evidence[i], "narration")
		t.blank()
	await t.type_line('"By noon they have stopped calling you Detective."', "narration")
	await t.type_line('"By sundown they are calling you the only suspect."', "err")
	t.blank()
	await t.press_enter_to_continue()
	t.clear_screen()
	t.art_set("court")
	Stings.play("gavel")
	t.blank()
	await t.type_line('"The trial is fast. Faster than anything you have ever seen move through Dudley\'s courts. A dead detective makes the city want a name, and they already have one. Yours."', "narration")
	t.blank()
	await t.type_line('"And you are not well. The compound is still in you - they held you on it, fed you on it, and whatever it is, it does not leave clean. Days later your thoughts still arrive late and sideways. The room tilts when you turn your head. Words you reach for are not where you left them."', "narration")
	t.blank()
	await t.type_line('"They offer you a lawyer. A young public defender with a nervous tie keeps leaning toward you, whispering questions, telling you what to say, what not to say."', "narration")
	t.blank()
	await t.type_line('Public Defender: "Detective - Mr. Cliveman - you have to let me do my job. If you\'d just tell them where you were, the timeline, anything - Mr. Cliveman, are you listening to me?"', "speaker")
	t.blank()
	await t.type_line('"You are trying to. His words come to you underwater. By the time you understand the question he has asked two more. You cannot hold the thread long enough to pull on it."', "narration")
	t.blank()
	await t.type_line('Cliveman: "I don\'t want him."', "speaker")
	await t.type_line('Judge: "Mr. Cliveman, I would strongly advise -"', "speaker")
	await t.type_line('Cliveman: "I don\'t want a lawyer. I\'ll speak for myself."', "speaker")
	t.blank()
	await t.type_line('"It is the worst decision you will ever make, and you make it through a fog you did not choose, with a drug you did not take, for reasons that will not survive the morning."', "narration")
	t.blank()
	await t.type_line('"You do not speak well. The room will not hold still. When the prosecutor asks where the compound in your coat came from, you tell them about the factory and the jars and the smile - slurring, losing the ends of your sentences - and you watch twelve faces decide you are exactly what the headlines say you are: a drunk, a burnout, a man who poisoned his partner and dosed himself for an alibi."', "narration")
	t.blank()
	await t.type_line('"The drug that is the proof of your innocence is the same thing making you look guilty. You are too far under to explain the difference. No one in the room is inclined to work it out for you."', "narration")
	t.blank()
	await t.type_line('"It takes the jury forty minutes."', "narration")
	t.blank()
	await t.sleep(900)
	Stings.play("gavel")
	await t.type_line("G U I L T Y", "err")
	await t.type_line('"Murder in the first degree. Detective Sergeant Harrison Bevan."', "dim")
	t.blank()
	t.section("C H A P T E R   3   -   E N D")
	t.art_set("court")
	await t.press_enter_to_continue()


func epilogue() -> void:
	t.section("E P I L O G U E")
	var cell := [
		'"Dudley State Correctional. Cell block C."',
		'"They take your badge. They take your coat - the one with the residue they say makes you a murderer. They take your belt and your laces and the eleven years you spent being a detective and they fold all of it into a paper bag with a number on it."',
		'"The door closes. It is a very specific sound. You will get to know it."',
	]
	for i in cell.size():
		await t.type_line(cell[i], "narration")
		t.blank()
	await t.press_enter_to_continue()
	await t.type_line('"The fog is finally lifting now, here, too late to matter - and through the clean cold edges of it you can see the whole shape of the night. Someone put that compound in his food. Someone put it in your drink and your coat. Someone wanted a dead detective and a living scapegoat too dazed to defend himself, and they got all of it, in one night, in a sub shop, over a number nine with extra mayo."', "narration")
	t.blank()
	await t.type_line('"You did not kill Bevan."', "narration")
	await t.type_line('"You know that the way you know your own name - the name they keep insisting is the only true thing about you and the name they took anyway."', "narration")
	t.blank()
	await t.type_line('"And every road back - the factory, the formula, the smile on a million jars - runs through the one company nobody in this city is allowed to touch."', "narration")
	t.blank()
	await t.sleep(800)
	await t.type_line('"You lie back on the cot. You listen to the block go quiet."', "narration")
	t.blank()
	await t.type_line('"You are going to get out of here."', "narration")
	await t.type_line('"You are going to clear your name."', "narration")
	await t.type_line('"And then you are going to find out who made the mayonnaise."', "narration")
	t.blank()
	await t.sleep(700)
	await t.type_line('Cliveman: "Bevan. Wherever you are. Save me a seat."', "speaker")
	t.blank()
	await t.sleep(1000)
	t.section("E N D   O F   P A R T   O N E")
	t.art_set("cell")
	await t.type_line('"Detective Cliveman will return."', "dim")
	t.blank()
	await t.press_enter_to_continue()
	if t.ended:
		return
	await t.finale().play_finale()


## runFrom(startCp): the whole game from a checkpoint onward.
func run_from(start_cp: int) -> void:
	if start_cp <= 1:
		S.checkpoint = 1
		if start_cp == 1:
			t.section("C H A P T E R   1")
		if S.at_drive_start:
			await t.type_line('"Back behind the wheel. Finish the drive to Big Smiles Mayo Corp HQ."', "narration")
			t.blank()
		else:
			await c1.ch1_house()
		if t.ended: return
		await c1.ch1_drive_to_factory()
		if t.ended: return
		S.at_drive_start = false
		await c1.ch1_clemons()
		if t.ended: return
	if start_cp <= 2:
		S.checkpoint = 2
		if start_cp == 2:
			t.section("C H A P T E R   1   -   R E S U M E D")
			await t.type_line('"You\'re back at Big Smiles Mayo Corp. Time to investigate."', "narration")
			t.blank()
		var start_floor := 1
		if S.resume_room_id >= Ch1.ROOM_F1 and S.resume_room_id <= Ch1.ROOM_F5:
			start_floor = S.resume_room_id
		await c1.ch1_factory(start_floor)
		if t.ended: return
		await c1.ch1_rooftop()
		if t.ended: return
	if start_cp <= 3:
		S.checkpoint = 3
		if start_cp == 3:
			t.section("C H A P T E R   2   -   R E S U M E D")
			await t.type_line('"You\'re back at Detective Bevan\'s apartment building."', "narration")
			t.blank()
			if not S.inventory.has("apartment building map"):
				t.add_item("apartment building map")
		else:
			await c2.ch2_arrive()
		if t.ended: return
		if S.resume_room_id != Ch2.ROOM_HALLWAY:
			await c2.ch2_lobby()
			if t.ended: return
			await t.floor_transition("up", "APARTMENT LOBBY", "F2 HALLWAY")
		await c2.ch2_hallway()
		if t.ended: return
	if start_cp <= 4:
		S.checkpoint = 4
		if start_cp == 4:
			t.section("C H A P T E R   2   -   R E S U M E D")
			await t.type_line('"You\'re back in Bevan\'s apartment (Room 203)."', "narration")
			t.blank()
		await c2.ch2_bevan_room()
		if t.ended: return
		await c2.ch2_bevan_interrogation()
		if t.ended: return
	if start_cp <= 5:
		S.checkpoint = 5
		if start_cp == 5:
			t.section("C H A P T E R   2   -   R E S U M E D")
			await t.type_line('"You\'re back at the collapsed factory crime scene."', "narration")
			t.blank()
		await c2.ch2_crime_scene()
		if t.ended: return
		await c2.ch2_car_breakdown()
		if t.ended: return
	if start_cp <= 6:
		S.checkpoint = 6
		if start_cp == 6:
			t.section("C H A P T E R   2   -   R E S U M E D")
			await t.type_line('"You\'re back in central Dudley. Find the cash."', "narration")
			t.show_status()
			t.blank()
		await ch2_dudley_open_world()
		if t.ended: return
		await c2.ch2_leave_dudley_to_petes()
		if t.ended: return
		await c2.ch2_petes()
		if t.ended: return
	S.checkpoint = 7
	await ch3()
	if t.ended: return
	await epilogue()
