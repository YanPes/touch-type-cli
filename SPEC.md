# ttc — touch-type-cli

A keybr-style adaptive touch-typing trainer for the terminal, made for a few
minutes of practice between meetings. **No network calls, ever** — all data
stays on the local machine.

## Stack

Node 22+, TypeScript (strict, ESM), Ink + React, pnpm, tsdown, vitest, Biome,
zod. MIT licence.

## Naming & files

| What     | Value                                                         |
| -------- | ------------------------------------------------------------- |
| package  | `touch-type-cli`                                              |
| command  | `ttc`                                                         |
| config   | `~/.ttcrc` (JSON, zod-validated, missing keys → defaults)     |
| progress | `$XDG_DATA_HOME/ttc/progress.json` (default `~/.local/share`) |

Progress is kept per layout profile. Env overrides `TTC_CONFIG` and
`TTC_DATA_DIR` exist for testing.

## Invocation

- `ttc` → main menu
- `ttc free | 10 | 20` → start that session immediately
- `--help`, `--version`
- Exits with a clear message when stdin/stdout is not a TTY or the terminal is
  smaller than 60×12.

## Main menu

- Modes: **Free** (first/default), **10 minutes**, **20 minutes**
- Settings: Layout (US QWERTY / DE QWERTZ), Uppercase, Stop on error —
  changes are written back to `~/.ttcrc`
- Reset progress (current layout, with confirmation)
- Quit

## Adaptive engine

- Layout determines the language: US QWERTY → English, DE QWERTZ → German.
- Text: pseudo-words from a letter-level n-gram (Markov) model with backoff,
  built ahead of time from public-domain text and committed as data.
- Lowercase letters only; German includes `ä ö ü ß`.
- Uppercase option: ~20% of words get a leading capital; it counts towards the
  base letter's stats.
- Start with the `startLetters` most frequent letters (default 6); further
  letters unlock in frequency order.
- A letter unlocks when every unlocked key has enough samples and its
  moving-average speed is ≥ `targetWpm` (default 35).
- Focus key = weakest unlocked key; most words in a line contain it.

## Typing screen

1. Key strip: all letters in unlock order, coloured by confidence, locked keys
   dimmed, focus key highlighted, flashes red on a miss.
2. Current line (~10 words): typed text dim, errors red (spaces get a red
   block), cursor underlined.
3. Metrics line: WPM, accuracy, focus key, elapsed / remaining time.

## Errors

- Default: the cursor advances on a mistake. `stopOnError` blocks until the
  right key is typed (config + menu).
- `showTypedChar` (config, default off) shows the wrongly typed char instead of
  the expected one.
- Backspace is ignored.

## Session end

Timed sessions finish the current line when time runs out. `Esc` ends any
session early. Both show a summary (WPM, accuracy, letters unlocked, weakest
keys) and then return to the menu. Progress is saved after every line.

## Config keys

`layout`, `targetWpm`, `startLetters`, `stopOnError`, `uppercase`,
`showTypedChar`, `unit` (`wpm` | `cpm`).

## Later

Stats screen (history is already recorded), punctuation & numbers, more
layouts/languages, home-row start mode.
