class_name Ch1
extends RefCounted
## story/ch1.js: the dream, the phone, the apartment, the drive, Clemons, the
## stacked factory and the rooftop. Transcribed call for call; the English
## strings are verbatim because translation keys on them.

const ROOM_HOUSE := 0
const ROOM_F1 := 1
const ROOM_F2 := 2
const ROOM_F3 := 3
const ROOM_F4 := 4
const ROOM_F5 := 5
const ROOM_FS12 := 101
const ROOM_FS23 := 102
const ROOM_FS34 := 103
const ROOM_FS45 := 104
const ROOM_LOBBY := 6
const ROOM_HALLWAY := 7
const ROOM_BEVAN := 8
const ROOM_CRIME := 9

var t: Node
var S: Node


func _init(terminal: Node) -> void:
	t = terminal
	S = GameState


func ch1_dream() -> void:
	t.play_music("dream")
	await t.cutscene([
		'"No. No. No."',
		'"You see a body, laid out bloody and bashed, on the floor of a hotel room between the bed and the TV stand. The body is that of your wife, who has been dead for two years. The sight of her blonde locks could drive any man insane - especially you. She looks so defeated. Lifeless. How could this happen? Who would hurt such an innocent girl? Who did this? Why? Why? WHY?!"',
		'"You awake."',
		'"You take a swig from your bottle of Vodka. It is bitter and tastes similar to what you imagine the drinking water in the Soviet Union tastes like. You go back to sleep - but it is short-lived. The phone next to your bed begins to ring."',
	], {"title": "A DREAM"})
	t.play_music("investigate")
	t.blank()


func ch1_phone() -> void:
	t.art_set("apartment")
	var attempts := 0
	while true:
		if t.ended:
			return
		var answer: bool
		if attempts == 0:
			answer = await t.yn('"Will you pick up the phone?"', "answer the phone", "reject the call")
		else:
			answer = true
		if answer:
			if attempts == 0:
				await t.type_line('"You lazily pick up the phone and hear the heavy diabetic breathing of your boss, Detective Bevan. He coughs into the phone and you are reminded of your time in the second world war where a grenade went off next to you and killed half of your platoon. Your ears are hurt, to say the least."', "narration")
			else:
				await t.type_line('"YOU LAZILY PICK UP THE PHONE AND HEAR THE HEAVY DIABETIC BREATHING OF YOUR BOSS, DETECTIVE BEVAN. HE COUGHS INTO THE PHONE. YOUR EARS ARE, ONCE AGAIN, HURT - TO SAY THE VERY LEAST."', "narration")
			t.blank()
			await t.type_line('Bevan: "Erhm, hey uh Clive... Clive Cliveman right? Is this even your number? The directory said this would be it - I have been calling and calling! You are lucky I don\'t have the authority to fire ya, haha. Anyway: get your butt over to Big Smiles Mayo Corp HQ. They\'ve had a break-in. Just go check it out now. I would, but, well, I couldn\'t be asked."', "speaker")
			t.blank()
			await t.type_line('"Bevan slams the phone and your ears are destroyed. You slump into bed. The clock says it is 3 AM. No rest for the wicked, eh?"', "narration")
			return
		else:
			attempts += 1
			if attempts == 1:
				await t.type_line('"You ignore the phone. The ringing stops... but then starts again."', "narration")
			else:
				await t.type_line('"You ignore the phone a second time. The ringing stops."', "narration")
				await t.sleep(1200)
				await t.type_line('"...You doze off."', "narration")
				await t.sleep(1200)
				t.blank()
				await t.type_line("GAME OVER - You slept through the case.", "err")
				var again: bool = await t.yn("Try again from the phone?")
				if again:
					attempts = 0
					continue
				await t.type_line('"Thanks for playing. Goodbye."', "sys")
				t.ended = true
				return


func ch1_house() -> void:
	var verb := ("press " + Pad.label_check()) if Pad.connected else "press C"
	await t.type_line('"Take a look around your apartment, or head to the front door. Walk to [D] and ' + verb + ' to leave."', "sys")
	t.tag_last_line("tpl", '"Take a look around your apartment, or head to the front door. Walk to [D] and {CHECK_VERB} to leave."')
	var grid := NavGrid.from_rows([
		[".", "U", ".", "."],
		["#", ".", ".", "U"],
		["D", ".", ".", "#"],
		[".", ".", ".", "."],
	])
	var events := {}
	events["0,1"] = func() -> Variant:
		await t.type_line('"You pick up an old framed photo from the shelf. It\'s your wife on your wedding day. You set it back down quickly."', "narration")
		return null
	events["1,3"] = func() -> Variant:
		await t.type_line('"An old wall clock. It reads 3:04 AM. You\'ve already wasted four minutes."', "narration")
		return null
	var exits := {"2,0": "leave_house"}
	await t.navigate_room(ROOM_HOUSE, grid, [3, 2], events, exits, {
		"title": "YOUR APARTMENT",
		"furniture": {"0,0": "bed", "0,2": "couch", "3,3": "tubeTV"},
		"itemArt": {"0,1": "photo", "1,3": "clock"},
	})
	await t.type_line('"God, I am getting too old to be walking up and down stairs to leave. They promised they would install an elevator. That was 10 years ago now..."', "speaker")


func ch1_drive_to_factory() -> void:
	t.art_set("collision")
	await t.type_line('"On your way to Dudley you witness a head-on collision. You keep driving. \'Save the busy work for the little guys.\'"', "narration")
	await t.drive_clives_buick("YOUR APARTMENT", "BIG SMILES MAYO CORP HQ")
	if t.ended:
		return
	t.art_set("factory")
	await t.type_line('"You waddle towards the Big Smiles Mayo Corp HQ. The building is massive - it rivals Hearth Tower itself."', "narration")
	await t.type_line('"A short, stout, mustachioed man in overalls and a fancy suit jacket wanders out, visibly distressed."', "narration")
	t.blank()
	await t.type_line('FAT MUSTACHED GUY: "Hey! You a cop? My name is Clemons; Clemons Dee Tubley!"', "speaker")
	await t.type_line('Clemons: "SOMEONE IS IN MY BUILDING! PLEASE HELP ME!"', "speaker")
	await t.type_line('"In the midst of his fit, he throws you a map of the headquarters."', "narration")
	t.add_item("factory map")
	t.blank()
	await t.type_line('"You step past him into the massive tower. Clemons runs in front of you. Maybe you could talk to him."', "narration")


func ch1_clemons() -> void:
	t.section("INTERROGATION 1 - CLEMONS DEE TUBLEY")
	t.art_set("factory")
	t.art_panel("clemons-neutral")
	await t.sleep(700)
	await t.type_line('Cliveman: "So, you say someone broke into your factory? Was it a competing mayo company perhaps?"', "speaker")
	t.blank()
	await t.type_line('Clemons: "Eh? I DUNNO I THINK IT WAS A UH KID OR SUMTIN, I dunno I uh..."', "speaker")
	t.blank()
	await t.type_line('Cliveman: "A kid? How do you know that?"', "speaker")
	t.blank()
	await t.type_line('Clemons: "I think it was a competitor. Yeah, a big crook! I saw him with my own two eyes!"', "speaker")
	t.blank()
	while true:
		if t.ended:
			return
		var a: Dictionary = await t.ask_choice("[ Call out his BS, or let it go?  Select BS or TRUTH ]", [
			{"keys": ["bs"], "label": "BS - call him out"},
			{"keys": ["truth", "t"], "label": "TRUTH - believe him"},
		])
		if (a["keys"] as Array).has("bs"):
			S.called_bs_clemons = true
			t.art_panel("clemons-cornered", "panel-slam")
			await t.type_line('Cliveman: "So you\'re telling me a kid AND a big crook broke in, and you saw both? You said \'I THINK IT WAS A UH KID OR SUMTIN\' and then changed your story."', "speaker")
			await t.type_line('Clemons: "ERMH! JUST GO ON THEN! JUST GO! I AM GOING TO GIVE MY LAWYER A RING! NOW GET!"', "speaker")
			await t.type_line('Cliveman: "Alright \'Bigman\'. Lying to an officer is an offense, you know."', "speaker")
			t.art_clear_panel()
			return
		else:
			t.art_panel("clemons-smug", "panel-slam")
			await t.type_line('Cliveman: "A competitor broke in and you saw him... I\'ll take a look around."', "speaker")
			await t.type_line('Clemons: "Yes! Take a look please. I feel incredibly unsafe."', "speaker")
			t.art_clear_panel()
			return


func factory_gate(code: String) -> bool:
	if code != "roof_access":
		return true
	var missing: Array[String] = []
	if not S.f2_badge:
		missing.append(I18n.t("Factory Access Badge (Floor 2)"))
	if not S.f3_poison:
		missing.append(I18n.t("Rat Poison (Floor 3)"))
	if not missing.is_empty():
		await t.type_line('"The roof door won\'t open yet. Finish sweeping the floors first - still missing: ' + ", ".join(missing) + '."', "err")
		return false
	if not S.kw2_found:
		await t.type_line('"The roof door won\'t budge. You never confronted whoever was moving around on the fourth floor - head back down and find him."', "err")
		return false
	return true


## buildFactoryStackedWorld(): all five rooms as one logical strip, with a world
## map placing each cell in real 3D so the floors stack over one footprint and
## the stair tower runs alongside.
func build_factory_stacked_world() -> Dictionary:
	const FLOOR_GAP := 16
	const FLOORS := 5
	const ROWS := 8
	var COLS := (FLOORS - 1) * FLOOR_GAP + 8
	var rows: Array = []
	var world: Array = []
	var h: Array = []
	for r in ROWS:
		var row: Array = []
		var wrow: Array = []
		var hrow: Array = []
		for c in COLS:
			row.append("#")
			wrow.append(null)
			hrow.append(0.0)
		rows.append(row)
		world.append(wrow)
		h.append(hrow)
	var grid := NavGrid.from_rows(rows)
	var events := {}
	var exits := {}
	var furniture := {}
	var item_art := {}
	var base_rooms := [
		[["#", "#", "#", "#", "#", "#", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", "K", ".", "#", ".", "I", "#"], ["#", "E", ".", ".", ".", ".", "#"], ["#", "#", "#", "#", "#", "#", "#"]],
		[["#", "#", "#", "#", "#", "#", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", "D", ".", "#", "I", ".", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", "#", "#", "#", "#", "#", "#"]],
		[["#", "#", "#", "#", "#", "#", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", "I", ".", "B", ".", ".", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", "#", "#", "#", "#", "#", "#"]],
		[["#", "#", "#", "#", "#", "#", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", ".", "#", "K", "#", ".", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", "#", "#", "#", "#", "#", "#"]],
		[["#", "#", "#", "#", "#", "#", "#"], ["#", ".", ".", "D", ".", ".", "#"], ["#", ".", ".", ".", ".", ".", "#"], ["#", "#", "#", "#", "#", "#", "#"], ["#", "#", "#", "#", "#", "#", "#"]],
	]
	for f in range(1, FLOORS + 1):
		var b := (f - 1) * FLOOR_GAP
		var y := (f - 1) * 3.0
		var room: Array = base_rooms[f - 1]
		for r in room.size():
			for c in room[r].size():
				grid.cells[r][b + c] = room[r][c]
				world[r][b + c] = {"x": c + 0.5, "y": y, "z": r + 0.5, "floor": f}
		grid.cells[1][b + 6] = "."
		world[1][b + 6] = {"x": 6.5, "y": y, "z": 1.5, "floor": f}
		match f:
			1:
				events["2,%d" % (b + 1)] = func() -> Variant:
					if not S.kw1_found:
						await t.type_line('"A frightened factory worker huddles against a mayo vat."', "narration")
						await t.type_line('Worker: "I ain\'t sayin\' nothin\'! I didn\'t see nothin\'! Leave me alone!"', "speaker")
						S.kw1_found = true
					else:
						await t.type_line('"The worker refuses to make eye contact with you."', "narration")
					return null
				events["2,%d" % (b + 5)] = func() -> Variant:
					await t.type_line('"A mop bucket filled with weeks-old mayo water. Utterly useless."', "narration")
					return null
				events["3,%d" % (b + 1)] = func() -> Variant:
					await t.type_line('"The street door you came in through. No sense leaving until you\'ve swept every floor."', "narration")
					return null
				furniture["1,%d" % (b + 1)] = "mayoVat"
				furniture["1,%d" % (b + 2)] = "mayoVat"
				furniture["3,%d" % (b + 4)] = "crate"
				item_art["2,%d" % (b + 5)] = "mopBucket"
			2:
				events["2,%d" % (b + 1)] = func() -> Variant:
					await t.type_line('"The door is locked from the inside. A stencilled sign reads: AUTHORIZED PERSONNEL ONLY - VATS 7-12."', "narration")
					return null
				events["2,%d" % (b + 4)] = func() -> Variant:
					if not S.f2_badge:
						await t.type_line('"You find a FACTORY ACCESS BADGE on the floor. Whoever was here dropped it in a hurry."', "narration")
						t.add_item("factory access badge")
						S.f2_badge = true
					else:
						await t.type_line('"You\'ve already grabbed that badge."', "narration")
					return null
				furniture["1,%d" % (b + 1)] = "mayoVat"
				furniture["1,%d" % (b + 2)] = "mayoVat"
				furniture["3,%d" % (b + 5)] = "barrel"
				item_art["2,%d" % (b + 4)] = "badge"
			3:
				events["2,%d" % (b + 1)] = func() -> Variant:
					if not S.f3_poison:
						await t.type_line('"You find a slightly burnt box of RAT POISON. This place must\'ve had a rat problem. You make a note of it."', "narration")
						t.add_item("rat poison (burnt box)")
						S.f3_poison = true
					else:
						await t.type_line('"You\'ve already noted the rat poison."', "narration")
					return null
				events["2,%d" % (b + 3)] = func() -> Variant:
					await t.type_line('"A bystander is crouched against the wall, rocking slightly."', "narration")
					await t.type_line('Bystander: "I saw him... he ran upstairs... he had something in his bag. Please don\'t tell him I told you."', "speaker")
					return null
				furniture["1,%d" % (b + 2)] = "mayoVat"
				furniture["1,%d" % (b + 4)] = "mayoVat"
				furniture["3,%d" % (b + 5)] = "crate"
				item_art["2,%d" % (b + 1)] = "ratPoison"
			4:
				var bb := b
				events["2,%d" % (b + 3)] = func() -> Variant:
					if not S.kw2_found:
						S.kw2_found = true
						grid.cells[2][bb + 3] = "X"
						t.blank()
						await t.type_line('"In the darkness a shadowy figure is crouched in the corner. You draw your revolver and flashlight - but the instant your light snaps on, he SHOVES you. You stumble back into the railing. He bolts up the last flight, toward the door marked ROOF ACCESS."', "narration")
						t.nav_repaint_room(grid)
						await t.type_line('"You haul yourself up, your back cracking, and give chase."', "narration")
					else:
						await t.type_line('"The corner is empty now. Just a draft and the smell of mayonnaise."', "narration")
					return null
				furniture["1,%d" % (b + 1)] = "barrel"
				furniture["1,%d" % (b + 4)] = "mayoVat"
			5:
				exits["1,%d" % (b + 3)] = "roof_access"
				furniture["1,%d" % (b + 1)] = "crate"
				furniture["1,%d" % (b + 5)] = "mayoVat"

	var stair_shape := [
		[8.5, 7.5, 0.0], [9.5, 7.5, 0.0], [10.5, 7.5, 0.0], [11.5, 7.5, 0.0],
		[12.5, 7.5, 0.0], [13.5, 7.5, 0.0], [13.5, 8.5, 0.0],
		[12.5, 8.5, 0.0], [11.5, 8.5, 0.0], [10.5, 8.5, 0.0],
		[9.5, 8.5, 0.0], [8.5, 8.5, 0.0], [8.5, 7.5, 0.0],
	]
	for f in range(1, FLOORS + 1):
		var b := (f - 1) * FLOOR_GAP
		var y := (f - 1) * 3.0
		var branch := [[1, b + 6], [1, b + 7], [2, b + 7], [3, b + 7], [4, b + 7], [5, b + 7], [6, b + 7], [7, b + 7]]
		for i in branch.size():
			var r: int = branch[i][0]
			var c: int = branch[i][1]
			grid.cells[r][c] = "."
			world[r][c] = {"x": 6.5 + i, "y": y, "z": 1.5, "floor": f} if i < 2 else {"x": 8.5, "y": y, "z": 1.5 + (i - 1), "floor": f}
	for f in range(1, FLOORS):
		var b := (f - 1) * FLOOR_GAP
		var y0 := (f - 1) * 3.0
		var pts := _resample(stair_shape, FLOOR_GAP + 1)
		for i in range(FLOOR_GAP + 1):
			var c := b + 7 + i
			var q: Array = pts[i]
			grid.cells[7][c] = "."
			world[7][c] = {"x": q[0], "y": y0 + (3.0 * i / FLOOR_GAP), "z": q[1], "floor": f + (1 if i == FLOOR_GAP else 0)}
	grid.floor_h = h
	grid.world_map = world
	grid.factory_stacked = true
	grid.ceil_h = 2.65
	return {"grid": grid, "events": events, "exits": exits, "furniture": furniture, "itemArt": item_art}


static func _resample(points: Array, count: int) -> Array:
	var lens := [0.0]
	for i in range(1, points.size()):
		var a: Array = points[i]
		var p: Array = points[i - 1]
		lens.append(lens[i - 1] + Vector3(a[0] - p[0], a[1] - p[1], a[2] - p[2]).length())
	var total: float = lens[lens.size() - 1]
	var out: Array = []
	for n in count:
		var d := total * n / float(count - 1)
		var j := 1
		while j < lens.size() and lens[j] < d:
			j += 1
		var a: Array = points[j - 1]
		var b: Array = points[mini(j, points.size() - 1)]
		var span: float = lens[mini(j, lens.size() - 1)] - lens[j - 1]
		if span == 0.0:
			span = 1.0
		var tt: float = (d - float(lens[j - 1])) / span
		out.append([a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, a[2] + (b[2] - a[2]) * tt])
	return out


func ch1_factory(start_floor: int = 1) -> String:
	t.section("BIG SMILES MAYO CORP - INVESTIGATION")
	await t.type_line('"All five factory floors occupy one continuous 3D building. The enclosed stair tower is just to the right of every room."', "sys")
	var W := build_factory_stacked_world()
	var f := clampi(start_floor if start_floor else 1, 1, 5)
	var base := (f - 1) * 16
	var start := [3, base + 2] if f == 1 else [1, base + 5]
	var result: String = await t.navigate_room(ROOM_F1, W["grid"], start, W["events"], W["exits"], {
		"title": "BIG SMILES MAYO CORP - STACKED FACTORY", "startHeading": 0, "freeMove": true, "seamless": true,
		"furniture": W["furniture"], "itemArt": W["itemArt"], "exitGate": factory_gate, "hideMinimap": true,
	})
	t.exit_nav_mode()
	return result


func ch1_rooftop() -> void:
	t.section("THE ROOFTOP")
	var lines := [
		'"You burst onto the roof. The city sprawls below - pitch black."',
		'"The suspect sprints across the rooftop. You chase."',
		'"He reaches the ledge and leaps onto the adjacent building - a 10-12 foot drop."',
		'"You have nothing left to live for. You get a running start and JUMP."',
		'"You land on your feet. Your ankles are obviously sprained."',
		'"You fall to your knees and crawl after the suspect. You raise your weapon."',
		'"He picks up a brick from the rooftop and tosses it at you."',
	]
	for i in lines.size():
		await t.type_line(lines[i], "narration")
		t.blank()
	t.instant_art("shoot")
	await t.sleep(700)
	await t.type_line('Cliveman: "You son of a *****! You threw a brick at me!"', "speaker")
	await t.type_line('Suspect: "Wha-WHAT?! YOU SHOT MY LEG!"', "speaker")
	await t.type_line('Cliveman: "Kid, I told you to stop! So I stopped you!"', "speaker")
	await t.type_line('Suspect: "OH GOD! My leg!"', "speaker")
	t.blank()
	await t.type_line('"You reach for the suspect\'s hand and he stabs you through the palm with a knife. Out of rage, you shoot his hand clean off. He leaps out of your grasp and falls off the building. Splat."', "narration")
	await t.type_line('"You walk back through the factory, past a shocked Clemons. You get in your Buick."', "narration")
	await t.type_line('"As you drive away you see the Big Smiles Mayo Corp building EXPLODE. \'Above your paygrade,\' you mutter, and keep driving."', "narration")
	t.blank()
	await t.press_enter_to_continue()
