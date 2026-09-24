class_name SaveStore
extends RefCounted
## Saved games, the Godot way: files in user:// (the game's own data folder),
## written and read with FileAccess.
##
## The browser build can only hand the player a download, so every SAVE drops
## a cliveman_save.clive into their Downloads folder and loading means picking
## that file again. Here each save is kept in user://saves/ and the load screen
## lists them. The files are the same .clive text (CLIVE1: + base64 JSON), so a
## save still moves between the two builds, and one from the browser can be
## imported from the load screen.

## Where saves live. The tools point this elsewhere so test runs never touch
## the player's saves.
static var folder := "user://saves"


## Writes the current game as a new save and returns its path, or "" if the
## folder could not be written.
static func write_save() -> String:
	if DirAccess.make_dir_recursive_absolute(folder) != OK and not DirAccess.dir_exists_absolute(folder):
		return ""
	var stamp := Time.get_datetime_string_from_system(false, false).replace("-", "").replace(":", "").replace("T", "_")
	var path := folder.path_join("save_%s.clive" % stamp)
	var n := 2
	while FileAccess.file_exists(path):
		path = folder.path_join("save_%s_%d.clive" % [stamp, n])
		n += 1
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return ""
	f.store_string(GameState.save_file_text())
	f.close()
	return path


## Every readable save, newest first:
## [{ "path", "data" (what decode_save takes), "dec", "ts" (unix seconds) }].
static func list_saves() -> Array:
	var out: Array = []
	var d := DirAccess.open(folder)
	if d == null:
		return out
	for name in d.get_files():
		if not name.ends_with(".clive"):
			continue
		var path := folder.path_join(name)
		var entry := read_save(path)
		if entry.is_empty():
			continue
		out.append(entry)
	out.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a["ts"] > b["ts"])
	return out


## One save file, parsed and checked; {} when it is not a valid Cliveman save.
static func read_save(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {}
	var data: Variant = GameState.parse_save_text(f.get_as_text())
	f.close()
	if data == null:
		return {}
	var dec := GameState.decode_save(data)
	if dec.is_empty():
		return {}
	var ts := float(FileAccess.get_modified_time(path))
	if data is Dictionary and (data as Dictionary).has("ts"):
		ts = float((data as Dictionary)["ts"]) / 1000.0
	return {"path": path, "data": data, "dec": dec, "ts": ts}


## "CHECKPOINT 3 · $120 · 23 SEP 21:35", in local time.
static func label(entry: Dictionary) -> String:
	var dec: Dictionary = entry["dec"]
	var bias := int(Time.get_time_zone_from_system().get("bias", 0)) * 60
	var dt := Time.get_datetime_dict_from_unix_time(int(entry["ts"]) + bias)
	var months := ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
	var when := "%d %s %02d:%02d" % [dt["day"], months[int(dt["month"]) - 1], dt["hour"], dt["minute"]]
	return "%s %d · $%d · %s" % [I18n.t("CHECKPOINT"), dec["cp"], dec["money"], when]


## The folder as the OS sees it, for the import dialog.
static func folder_on_disk() -> String:
	DirAccess.make_dir_recursive_absolute(folder)
	return ProjectSettings.globalize_path(folder)
