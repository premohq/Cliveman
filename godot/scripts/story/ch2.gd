class_name Ch2
extends RefCounted
## story/ch2.js: Bevan's building, waking Bevan, the collapsed factory, the
## breakdown, the drive to Pete's, Pete's Subs, the alley and the arrest.

const ROOM_LOBBY := 6
const ROOM_HALLWAY := 7
const ROOM_BEVAN := 8
const ROOM_CRIME := 9

const BEVAN_RANDOM_LINES := [
	'Bevan: "Where am I?"',
	'Bevan: "You know Cliveman, you are one of the best presidents."',
	'Bevan: "I am starving, Cliveman."',
	'Bevan: "Is that... is that a mayo? I\'m gonna eat it."',
	'Bevan: "I feel like I\'m going to throw up on a constitutional level."',
	'Bevan: "Clive? CLIVE? Are we at the zoo?"',
	'Bevan: "My back hurts. My front hurts. Everything hurts."',
	'Bevan: "*hic* ...did I eat a wasp?"',
]

var t: Node
var S: Node


func _init(terminal: Node) -> void:
	t = terminal
	S = GameState


func ch2_arrive() -> void:
	t.section("C H A P T E R   2   -   B E G I N S")
	await t.type_line('"Shortly after the incident at the Mayo factory you decide this investigation needs more hands. You head to Detective Bevan\'s apartment building."', "narration")
	await t.drive_clives_buick("BIG SMILES MAYO CORP HQ", "DETECTIVE BEVAN'S APARTMENT", {
		"title": "DRIVE TO BEVAN'S APARTMENT",
		"destLabel": "BEVAN'S APARTMENT",
		"markAtDriveStart": false,
		"arriveLine": 'Cliveman: "Bevan\'s building. Let\'s see if the old man\'s sober enough to help."',
		"driveQuips": [
			'Cliveman: "Time to go wake up Bevan. He\'s gonna love that."',
			'Cliveman: "A whole factory, gone - and I\'m the one driving cross-town for backup."',
			'Cliveman: "Bevan better be sober. For once."',
			'Cliveman: "Detective Bevan\'s place. Smells like cigars and regret, if I recall."',
			'Cliveman: "Every block in Dudley looks the same at night."',
			'Cliveman: "Red marker, red marker... Bevan\'s building is around here somewhere."',
			"*the V8 rumbles*",
			"*tires hum over wet asphalt*",
			"*a distant siren wails back toward the factory*",
		],
		"hitQuips": [
			'Cliveman: "*CRUNCH* ...Bevan\'s gonna ask about that dent."',
			'Cliveman: "That wall came out of nowhere."',
			'Cliveman: "The city can bill me. They owe me a factory anyway."',
			"*metal crunch echoes down the block*",
			"*tires screech against brick*",
		],
	})
	if t.ended:
		return
	await t.type_line('"You enter the building and are greeted by a depressed desk clerk who directs you to pick up a map of the building\'s layout."', "narration")
	t.add_item("apartment building map")
	t.blank()


func ch2_lobby() -> String:
	var grid := NavGrid.from_rows([
		[".", ".", ".", ".", "E"],
		["B", ".", "#", ".", "."],
		[".", ".", "#", ".", "."],
		["S", ".", ".", ".", "."],
	])
	var events := {}
	events["1,0"] = func() -> Variant:
		await t.type_line('Desk Clerk: "*Monotone* Hello sir. Your face doesn\'t seem familiar. Are you here to see someone?"', "speaker")
		var ans: bool = await t.yn("Are you looking for someone?")
		if ans:
			await t.type_line('Desk Clerk: "You look like one of \'em detectives. Mr. Bevan is in Room 203."', "speaker")
			S.bevan_room_known = true
			await t.type_line('"[NOTE: Detective Bevan - Room 203]"', "sys")
		else:
			await t.type_line('Desk Clerk: "No? You here lookin for... me?"', "speaker")
			await t.type_line('"*flips OPEN sign to CLOSED*"', "narration")
		return null
	var exits := {"3,0": "stairs_to_hallway"}
	return await t.navigate_room(ROOM_LOBBY, grid, [0, 4], events, exits, {
		"title": "APARTMENT LOBBY",
		"furniture": {"1,1": "deskLobby", "3,3": "couch"},
	})


func ch2_hallway() -> void:
	var grid := NavGrid.from_rows([
		["v", ".", ".", ".", ".", ".", "."],
		["1", ".", "#", "#", "#", ".", "4"],
		["2", ".", ".", ".", ".", ".", "5"],
		["3", ".", "#", "#", "#", ".", "6"],
	])
	var filler := {
		"1,0": 'You knock on 201. A muffled shout: "GO AWAY!"',
		"2,0": "You knock on 202. Deep snoring - whoever's inside doesn't stir.",
		"1,6": "You knock on 204. Someone slides a DO NOT DISTURB sign under the door.",
		"2,6": "You knock on 205. A small child answers, stares at you, then closes the door.",
		"3,6": "You knock on 206. No answer. You try twice more. Still nothing.",
	}
	var events := {}
	for k in filler:
		var msg: String = filler[k]
		events[k] = func() -> Variant:
			await t.type_line('"' + msg + '"', "narration")
			return null
	events["3,0"] = func() -> Variant:
		if S.bevan_room_known:
			await t.type_line('"Room 203 - the clerk told you this is Bevan\'s room."', "narration")
		await t.type_line('"You knock three times. No answer. You let yourself in."', "narration")
		return null
	var exits := {"0,0": "back_to_lobby", "3,0": "bevan_room"}
	while true:
		if t.ended:
			return
		var result: String = await t.navigate_room(ROOM_HALLWAY, grid, [0, 0], events, exits, {"title": "APARTMENT BUILDING - F2 HALLWAY"})
		if result == "bevan_room":
			return
		if result == "back_to_lobby":
			await t.floor_transition("down", "F2 HALLWAY", "APARTMENT LOBBY")
			await t.type_line('"You head back to the lobby... but then remember you need to find Bevan. You turn around."', "narration")
			await t.floor_transition("up", "APARTMENT LOBBY", "F2 HALLWAY")
		if result == "":
			return


func ch2_bevan_room() -> void:
	var verb := ("press " + Pad.label_check()) if Pad.connected else "press C"
	await t.type_line('"You let yourself into Bevan\'s room (203). The smell hits like a wall - alcohol and something worse. Bevan is passed out in the corner with 4 empty whiskey bottles. Walk to K and ' + verb + ' to wake him."', "sys")
	t.tag_last_line("tpl", '"Bevan is passed out in the corner with 4 empty whiskey bottles. Walk to K and {CHECK_VERB} to wake him."')
	var grid := NavGrid.from_rows([
		[".", ".", "E", ".", "."],
		["U", ".", ".", "#", "U"],
		[".", ".", ".", "#", "U"],
		["K", ".", ".", "U", "."],
	])
	var events := {}
	events["1,0"] = func() -> Variant:
		await t.type_line('"A pile of laundry so old it has become sentient. You back away."', "narration")
		return null
	events["1,4"] = func() -> Variant:
		await t.type_line('"A broken antenna TV showing static. Somehow still on."', "narration")
		return null
	events["2,4"] = func() -> Variant:
		await t.type_line('"Seven empty whiskey bottles lined up like trophies. You count twice. Seven."', "narration")
		return null
	events["3,3"] = func() -> Variant:
		await t.type_line('"A stack of unpaid parking tickets and a weeks-old half-eaten sandwich."', "narration")
		return null
	events["3,0"] = func() -> Variant:
		await t.type_line('"You crouch down next to the passed-out Bevan."', "narration")
		return null
	var exits := {"3,0": "bevan_talk"}
	await t.navigate_room(ROOM_BEVAN, grid, [0, 2], events, exits, {
		"title": "BEVAN'S APARTMENT (203)",
		"furniture": {"0,0": "couch", "0,4": "fridge", "3,2": "crate"},
		"itemArt": {"1,0": "laundry", "1,4": "tv", "2,4": "bottles", "3,3": "papers"},
	})


func ch2_bevan_interrogation() -> void:
	t.section("CONVINCING BEVAN")
	t.instant_art("bevan")
	await t.sleep(600)
	var lines := [
		["Cliveman", '"Come on Bevan, on your feet."'],
		["Detective Bevan", '".tahW - .tahW"  [spoken backwards]'],
		["Cliveman", '"For God\'s sake Bevan, you are wasted."'],
		["Detective Bevan", '"Ka-... Karen... is that you?"'],
		["Cliveman", '"Wha - No! Get up Bevan, we have a job to do!"'],
		["Detective Bevan", '"OkAY, dOn\'T mInD thE SmEll, I pEE iN bOTtLeS..."'],
		["Cliveman", '"Good lord... Alright let\'s sober you up."'],
		["Detective Bevan", '"DON\'T TOUCH ME WOMAN!"'],
		["Cliveman", '"BEVAN! THE FACTORY EXPLODED!"'],
		["Detective Bevan", '"WhO exPloDeD?"'],
		["Cliveman", '"The factory. I need you at the scene with me."'],
		["Detective Bevan", '"I aM StArVIng."'],
		["Cliveman", '"*sighs* I will take you out to eat AFTER we investigate."'],
		["Detective Bevan", '"Okay BROTHER!"'],
		["Cliveman", '"Give me your gun. I\'d rather you not shoot me on accident."'],
		["Detective Bevan", '".em toohS t\'now I"  [spoken backwards]'],
		["Cliveman", '"Yeah, not taking my chances." *Takes gun*'],
		["Detective Bevan", '"GiVe ME BaCK mY bOTtLe."'],
	]
	for i in lines.size():
		await t.type_line(lines[i][0] + ": " + lines[i][1], "speaker")
	t.blank()


func ch2_crime_scene() -> void:
	await t.type_line('"After convincing Bevan - and Bevan falling down the stairs - you leave the apartment building."', "narration")
	await t.car_transition("BEVAN'S APARTMENT", "COLLAPSED FACTORY CRIME SCENE")
	if t.ended:
		return
	t.art_set("ruins")
	Stings.play("dread")
	await t.type_line('"Police are all over the collapsed factory. You show your badge; Bevan shows the officer his bottle of booze."', "narration")
	await t.type_line('"You enter the collapsed factory with Bevan. Everything is destroyed and burnt."', "narration")
	t.blank()
	var grid := NavGrid.from_rows([
		["#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"],
		["#", "E", ".", ".", "#", ".", ".", ".", ".", ".", ".", ".", "#"],
		["#", "#", "#", ".", "#", ".", "#", ".", "#", "#", "#", ".", "#"],
		["#", ".", ".", ".", "#", "U", "#", ".", "#", "I", "#", ".", "#"],
		["#", ".", "#", "#", "#", "#", "#", ".", "#", ".", "#", ".", "#"],
		["#", ".", "#", "U", ".", ".", "#", ".", "#", ".", "U", ".", "#"],
		["#", ".", "#", ".", "#", ".", "#", ".", "#", ".", "#", "#", "#"],
		["#", "L", ".", ".", "#", ".", ".", ".", "#", ".", ".", "I", "#"],
		["#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#", "#"],
	])
	if S.ch2_tnt:
		grid.cells[7][11] = "X"
	if S.ch2_poison:
		grid.cells[3][9] = "X"
	var events := {}
	events["7,11"] = func() -> Variant:
		if not S.ch2_tnt:
			await t.type_line('"You find a stick of UNDETONATED TNT amongst the rubble. You mark it carefully in your notes."', "narration")
			t.add_item("undetonated TNT")
			S.ch2_tnt = true
		else:
			await t.type_line('"You\'ve already logged the TNT."', "narration")
		return null
	events["3,9"] = func() -> Variant:
		if not S.ch2_poison:
			await t.type_line('"You find a slightly burnt box of RAT POISON. This place must\'ve had a rat problem. You make a note of it."', "narration")
			if not S.inventory.has("rat poison (burnt box)"):
				t.add_item("rat poison (crime scene)")
			S.ch2_poison = true
		else:
			await t.type_line('"You\'ve already noted the rat poison."', "narration")
		return null
	events["3,5"] = func() -> Variant:
		await t.type_line('"Charred papers and broken equipment - too destroyed to be useful."', "narration")
		return null
	events["5,10"] = func() -> Variant:
		await t.type_line('"Burnt debris - completely ruined. Nothing useful."', "narration")
		return null
	events["5,3"] = func() -> Variant:
		await t.type_line('"More charred junk. Useless."', "narration")
		return null
	var leave_gate := func(code: String) -> bool:
		if code == "leave_scene":
			var missing: Array[String] = []
			if not S.ch2_tnt:
				missing.append("TNT")
			if not S.ch2_poison:
				missing.append("Rat Poison")
			if not missing.is_empty():
				await t.type_line('"Still need to find: ' + ", ".join(missing) + '. This maze of rubble is bigger than it looks."', "err")
				return false
			await t.type_line('"Well, I got everything discernible from this scene. Not seeing an obvious connection. I need Bevan\'s help and he will only talk once I get him food."', "speaker")
			return true
		return true
	var exits := {"7,1": "leave_scene"}
	var on_move := func(_pos: Array) -> void:
		if randf() < 0.2:
			var line: String = BEVAN_RANDOM_LINES[int(floor(randf() * BEVAN_RANDOM_LINES.size()))]
			await t.type_line(line, "speaker")
	await t.navigate_room(ROOM_CRIME, grid, [1, 1], events, exits, {
		"title": "CRIME SCENE - COLLAPSED FACTORY",
		"itemArt": {"7,11": "tnt", "3,9": "ratPoison", "3,5": "debris", "5,10": "debris", "5,3": "debris"},
		"exitGate": leave_gate,
		"onMove": on_move,
	})


func ch2_car_breakdown() -> void:
	t.art_set("garage")
	await t.type_line('"You and Bevan pile into the Buick. You crank the key. The engine turns over once, sputters, and dies with a wet mechanical cough."', "narration")
	await t.sleep(800)
	await t.type_line('Cliveman: "No. No no no. Not now."', "speaker")
	await t.type_line('Bevan: "Is the car dead too? Everything\'s dying today."', "speaker")
	t.blank()
	await t.type_line('"You coast to a dead stop in the middle of central Dudley — ironically, right in front of a car repair shop."', "narration")
	await t.type_line('"You both get out. A mechanic in greasy overalls wanders over, chewing something."', "narration")
	t.blank()
	await t.type_line('Mechanic: "That\'s a rough sound. I can fix her up. Two-fifty."', "speaker")
	await t.type_line('Cliveman: "Two hundred and fifty dollars? I\'ve got a hundred on me."', "speaker")
	await t.type_line('Mechanic: "Look, I see you\'re a detective. Tell you what — leave the car here. Scrape up the money around town and come back when you\'ve got $250. I ain\'t goin\' nowhere."', "speaker")
	t.blank()
	S.money = 100
	S.mechanic_paid = false
	await t.type_line('"You pat your wallet. $100. The tavern, the arcade, the horse track... Dudley\'s got ways to make money if you\'re willing to play rough."', "narration")
	t.show_status()
	t.blank()
	await t.press_enter_to_continue()


func ch2_leave_dudley_to_petes() -> void:
	t.blank()
	if S.secret_ending:
		await secret_ending()
		t.ended = true
		return
	await t.type_line('"The Buick coughs to life. You and Bevan climb in. Bevan immediately reclines the seat and groans."', "narration")
	await t.drive_clives_buick("CENTRAL DUDLEY", "PETE'S SUBS", {
		"title": "DRIVE TO PETE'S SUBS",
		"destLabel": "PETE'S SUBS",
		"markAtDriveStart": false,
		"arriveLine": 'Cliveman: "Pete\'s Subs. Try not to fall out of the car, Bevan."',
		"driveQuips": [
			'Bevan: "Pete\'s Subs... oh man, I can already taste the meatball."',
			'Cliveman: "You can taste it because you haven\'t had a real meal in days, Bevan."',
			'Bevan: "Are we there yet, Clive?"',
			'Cliveman: "We were almost there until you grabbed the wheel."',
			'Bevan: "I think I left my bottle back in Dudley."',
			'Cliveman: "Good. Consider it a head start on sobriety."',
			'Bevan: "Clive, if you hit one pothole my stomach is staging a coup."',
			'Cliveman: "Then hold it together. We\'re close."',
			'Bevan: "*hic* ...do subs come with a side of nap?"',
			'Bevan: "I miss Karen. Karen would\'ve loved a meatball sub."',
			"*Bevan hums something tuneless*",
			"*the V8 rumbles*",
			"*tires hum over wet asphalt*",
		],
		"hitQuips": [
			'Bevan: "WHOA-HO! Watch the road, watch the ROAD!"',
			'Cliveman: "I AM watching the road, Bevan."',
			'Bevan: "My sub\'s gonna be a SQUISHED sub before we even buy it!"',
			'Cliveman: "*CRUNCH* ...the city can bill me."',
			'Bevan: "You drive worse than I do, and I can\'t feel my face!"',
			'Cliveman: "That is not the endorsement you think it is."',
			"*metal crunch, and a drunken WOO from the passenger seat*",
			"*Bevan slides into the door with a thud*",
		],
	})


func secret_ending() -> void:
	t.section("S E C R E T   E N D I N G")
	await t.type_line('"You walked out of the Gumshoe Tavern with a thousand dollars in your coat pocket."', "narration")
	await t.type_line('"You bought the car back, slid into the driver\'s seat, and looked over at Bevan."', "narration")
	t.blank()
	await t.type_line('Cliveman: "Bevan. We\'re done. We\'re retiring."', "speaker")
	await t.type_line('Bevan: "What about the case?"', "speaker")
	await t.type_line('Cliveman: "The case can solve itself. We\'ve got a thousand bucks and two pulses. That\'s enough."', "speaker")
	t.blank()
	await t.type_line('"You drove out of Dudley as the sun came up. Bevan laughed the whole way. Somewhere behind you, a factory still smoldered. You never looked back."', "narration")
	t.blank()
	await t.type_line("   — THE EARLY RETIREMENT ENDING —", "credits")
	t.blank()
	await t.press_enter_to_continue()


func ch2_petes() -> void:
	# ═══ Pete's Subs — Expanded Scene ═══
	t.play_music("lonely")
	t.art_set("diner")
	await t.type_line('"The neon sign on Pete\'s Subs is missing two letters. It reads: PE E\'S UBS."', "narration")
	t.blank()
	await t.type_line('Bevan: "PE E\'S UBS! Clive! PE E\'S UBS!"', "speaker")
	await t.type_line('"Bevan is laughing so hard he has to lean against the door frame. You have not seen Bevan laugh like this in years. Maybe ever."', "narration")
	await t.type_line('Cliveman: "I see it."', "speaker")
	await t.type_line('Bevan: "It\'s a— it\'s a sign, Clive. It\'s a sign from God."', "speaker")
	await t.type_line('Cliveman: "Let\'s just eat."', "speaker")
	t.blank()
	await t.press_enter_to_continue()
	t.clear_screen()
	t.art_set("diner")

	# Interior
	await t.type_line('"The place smells like toasted bread and industrial cleaning fluid. A teenage employee mops something in the corner. Another employee, mid-twenties, stands behind the counter. Her name tag says LINDA."', "narration")
	t.blank()
	await t.type_line('Bevan: "I\'ll have two number nines, a number nine large, a number six with extra dip, a number 7, two number 45\'s - one with cheese - and a large soda."', "speaker")
	await t.type_line('Linda: "...Okay. And for you, sir?"', "speaker")
	await t.type_line('Cliveman: "Coffee."', "speaker")
	await t.type_line('Linda: "We don\'t have coffee."', "speaker")
	await t.type_line('Cliveman: "Of course you don\'t."', "speaker")
	await t.type_line('Linda: "We have a Sprite."', "speaker")
	await t.type_line('Cliveman: "Fine."', "speaker")
	t.blank()
	await t.press_enter_to_continue()

	# Waiting
	await t.type_line('"Bevan has started telling you a story about a parking dispute he had in 1987 that resulted in a man named Gerald losing a tooth. You have heard this story approximately forty times. You do not stop him. He looks happy. You cannot remember the last time Bevan looked happy."', "narration")
	t.blank()
	await t.type_line('"The food arrives. Bevan unwraps his first sandwich with genuine ceremony."', "narration")
	t.blank()
	await t.type_line('Bevan: "You know what this is, Clive? This is the reward. You work all your life, you push through it, and at the end — at the end, there\'s a number nine. With extra mayo."', "speaker")
	await t.type_line('Cliveman: "That\'s very profound."', "speaker")
	await t.type_line('Bevan: "I\'m a profound person."', "speaker")
	t.blank()
	await t.press_enter_to_continue()

	# The Death
	t.clear_screen()
	t.art_set("diner")
	await t.type_line('"Bevan takes a massive bite."', "narration")
	await t.sleep(800)
	await t.type_line('"The cough starts small. Bevan puts a hand up like he\'s fine."', "narration")
	await t.sleep(600)
	await t.type_line('"He is not fine."', "narration")
	await t.sleep(700)
	# Bach's Air carries the death and everything after it
	t.play_music("bevan_death")
	# graphical death sting: red vignette + screen glitch + harsh audio
	await t.bevan_death_effect()
	t.blank()
	await t.type_line('"Bevan\'s face goes from pink to red. Then past red into something you don\'t have a word for — a deep, ugly purple that has no business being on a human face. He grips the table. The soda tips. His eyes go very wide and then very still."', "narration")
	t.blank()
	await t.type_line('"You are already out of the booth. You are saying his name. You are saying it louder. He is not answering."', "narration")
	t.blank()
	await t.type_line('Cliveman: "Bevan. BEVAN. Look at me—"', "speaker")
	t.blank()
	await t.type_line('"Your hands are on his collar. The number nine is still in his other hand. Half-eaten. The mayo is the wrong color and you can see it now, you can finally see it, and it is too late."', "narration")
	t.blank()
	await t.type_line('"And then your own mouth goes numb. The Sprite. You only had a few sips of the Sprite — but your tongue is thick and the fluorescent lights have started to hum at the wrong frequency and your hands do not feel like your hands."', "narration")
	await t.sleep(600)
	await t.type_line('"They got you too. Whatever was in his food was in your drink. Less of it. Enough."', "err")
	t.blank()
	await t.type_line('Cliveman: "What did you put in it."', "speaker")
	await t.type_line('"You are not talking to Bevan anymore."', "narration")
	t.blank()
	await t.press_enter_to_continue()

	# The Panic + The Threat
	await ch2_alley_grief()
	# The Arrest
	await ch2_arrest()

	t.section("C H A P T E R   2   -   E N D")
	await t.press_enter_to_continue()


func ch2_alley_grief() -> void:
	t.clear_screen()
	t.art_set("diner")
	t.blank()
	await t.type_line('"You turn around. Linda is frozen behind the counter. The teenager has stopped mopping. The mop handle hits the floor and the sound is enormous."', "narration")
	t.blank()
	await t.type_line('Cliveman: "What did you put in his sandwich."', "speaker")
	await t.type_line('Linda: "Sir — sir, I don\'t — he just ordered, I only —"', "speaker")
	await t.type_line('Cliveman: "The mayo. The MAYO. One of you touched it. One of you put something in it. He took one bite — he took ONE bite —"', "speaker")
	t.blank()
	await t.type_line('"You are advancing on the counter. You do not remember deciding to. Linda backs into the soda machine. The teenager has both hands up."', "narration")
	t.blank()
	await t.type_line('Teen: "Mister, please, we just work here —"', "speaker")
	await t.type_line('Cliveman: "Then who DOESN\'T just work here? Who comes in? Who supplies you? WHERE DOES THE MAYO COME FROM?"', "speaker")
	t.blank()
	await t.type_line('"Your voice does not sound like your voice. Somewhere under the noise a small clear part of you is saying this is wrong, you are scaring them, they are children, sit down — but that part is very far away and getting farther."', "narration")
	t.blank()
	await t.type_line('"Linda is crying. The teenager has dropped the mop and neither of them will look you in the eye. Neither of them has the answer you are screaming for, because there is no answer here, because the answer was never going to be in a sub shop on the edge of Dudley."', "narration")
	t.blank()
	await t.type_line('"But you cannot stop. You have not been able to stop anything tonight."', "narration")
	t.blank()
	await t.press_enter_to_continue()


func ch2_arrest() -> void:
	t.play_music("descent")
	t.clear_screen()
	t.art_set("arrest")
	Stings.play("hit")
	t.blank()
	await t.type_line('"Red and blue light fills the windows. You did not hear the call go out. Linda must have hit something behind the counter. Good for her."', "narration")
	t.blank()
	await t.type_line('"Two officers come through the door with their hands near their belts."', "narration")
	t.blank()
	await t.type_line('Officer Reyes: "Sir, step away from the counter. Hands where I can see them."', "speaker")
	await t.type_line('Cliveman: "I\'m a detective. Dudley PD. My partner — my partner is —"', "speaker")
	await t.type_line('"(He\'s right there. Tell them. Tell them he\'s right there.)"', "dim")
	await t.type_line('Officer Reyes: "Sir, there\'s a deceased male in the booth and two employees saying you threatened them. I need you to step back. Now."', "speaker")
	t.blank()
	await t.type_line('"You try to explain. The words come out in the wrong order. You tell them about the factory and the jars and the formula and the smile on every label, and you can hear how it sounds, you can hear exactly how it sounds, and you cannot make it sound any other way."', "narration")
	t.blank()
	await t.type_line('Cliveman: "It\'s the mayo. It\'s in the mayo. Check his sandwich. CHECK THE SANDWICH —"', "speaker")
	t.blank()
	await t.type_line('"The fluorescent lights stretch and smear. Linda\'s face doubles. For half a second every jar on the shelf behind the counter is wearing the Big Smiles logo and every logo is grinning at you and the grins are moving."', "narration")
	await t.sleep(700)
	await t.type_line('"You blink. They are just jars. You are on the floor and you do not remember getting there. There is a knee in your back and a voice reading you words you have read to other people a hundred times."', "narration")
	t.blank()
	await t.type_line('Officer Reyes: "— anything you say can and will be used against you —"', "speaker")
	t.blank()
	await t.type_line('"You stop fighting. Not because you decide to. Because you are very tired, and Bevan is dead, and you cannot make the room hold still."', "narration")
	t.blank()
	await t.press_enter_to_continue()
