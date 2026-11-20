# Glizzy Gobbler

*"THEY'RE NOT GETTING AWAY WITH THE RELISH."*

A ridiculous retro arcade shooter in the Galaga tradition. You're a floating, tooth-spitting hero, and space is full of hotdogs.

## Play

Open `index.html` in a browser. No build step and no dependencies. To serve it locally:

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

It also works as-is on GitHub Pages.

## Controls

| Desktop | Mobile |
|---|---|
| ← → / A D to move | Drag anywhere to move |
| Space to shoot teeth | Hold **FIRE** |
| P / Esc to pause, M to mute | Pause and mute buttons, top-right |

## Features

- **The eating mechanic:** each hit strips one topping or takes one bite, until the glizzy is fully gobbled. Different dogs have different bite counts.
- **8 hotdog types:** ketchup, mustard, relish, The Works, chili cheese, bacon-wrapped, giant, and mutant. Giants and mutants split into mini-dogs.
- **8 power-ups:** Tooth Machine Gun, Golden Tooth, Dental Floss, Braces, Mouthwash, Double Dentures, Giant Molar, Sugar Rush.
- **Boss every 5 waves:** The Mega Chili Dog, The Condiment King, The Bratwurst Beast, and The Ultimate Combo.
- Combo multiplier up to x8, bonus lives, accuracy and no-hit wave bonuses, and a local high-score table.
- Synthesized chiptune music and sound effects, with volume controls.

## Files

- `index.html`, `style.css`: screens and UI
- `js/game.js`: game loop, enemies, bosses, power-ups, HUD
- `js/sprites.js`: procedural, cached hotdog, tooth, and power-up art
- `js/audio.js`: Web Audio sound effects and music sequencer
- `assets/player.png`: the player character
