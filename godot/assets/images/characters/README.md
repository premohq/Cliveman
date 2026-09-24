# Character figures

Raster stand-ins for `CHAR_ART_DEFS` in `engine/transitions.js`, which draws its
two figures as procedural SVG. Drop a file named after the art key here and the
story picks it up with no code change:

| Key | Where it appears | File to add |
| --- | --- | --- |
| `shoot` | The rooftop gunshot, end of chapter one | `shoot.jpg` |
| `bevan` | Bevan passed out with the whiskey bottles, chapter two | `bevan.jpg` |

Anything missing simply does not draw, and the scene illustration behind it
carries the beat on its own.

The Clemons reaction panels are a different system and live in
`assets/images/interrogations/`. Those are the corner panels an interrogation
slams up; these are figures centred over the scene.
