extends Node
## Autoload. The browser build's localStorage: a handful of string preferences
## (language, voice on/off) that survive restarts.

const PATH := "user://prefs.cfg"

var _cfg := ConfigFile.new()


func _init() -> void:
	_cfg.load(PATH)


func get_value(key: String, default: Variant = null) -> Variant:
	return _cfg.get_value("local_storage", key, default)


func set_value(key: String, value: Variant) -> void:
	_cfg.set_value("local_storage", key, value)
	_cfg.save(PATH)
