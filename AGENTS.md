# AGENTS.md

Guidance for coding agents (and humans) working on ttc. User-facing docs live
in `README.md`; this file holds the constraints, design rules and workflows
behind them.

## What ttc is

A keybr-style adaptive touch-typing trainer for the terminal, made for a few
minutes of practice between meetings. Published to npm as `touch-type-cli`,
command `ttc`.

## Hard constraints

- **No network calls, ever.** ttc runs fully offline; all data stays on the
  local machine. Do not add telemetry, update checks or downloads at runtime.
  (`scripts/fetch-corpus.sh` is a dev-only tool and is not shipped.)
- Node 22+, TypeScript (strict, ESM), Ink + React, pnpm, tsdown, vitest,
  Biome, zod. MIT licence.
- The npm package ships only `dist/`.
- Must exit with a clear message when stdin/stdout is not a TTY or the terminal
  is smaller than 60×12.

## Commands

```sh
pnpm install
pnpm dev          # run from source (tsx)
pnpm test         # vitest
pnpm lint         # biome check
pnpm format       # biome check --write
pnpm typecheck    # tsc --noEmit
pnpm build        # bundle to dist/ with tsdown
```

Run `pnpm lint && pnpm typecheck && pnpm test` before committing.

## Code layout

| Path              | Contents                                                       |
| ----------------- | -------------------------------------------------------------- |
| `src/cli.tsx`     | Argument parsing, TTY/size checks, starts the Ink app          |
| `src/core/`       | Pure logic: layouts, languages, n-gram models, generator, stats, trainer, typing |
| `src/ui/`         | Ink components (menu, typing screen, summary, key strip)       |
| `src/storage/`    | Config and progress files (zod schemas, atomic JSON writes)    |
| `src/data/models` | Prebuilt letter n-gram models (`en.json`, `de.json`)           |
| `scripts/`        | Corpus download and model build (dev only)                     |

Keep `src/core` free of I/O and UI so it stays unit-testable; the UI keeps the
trainer state and calls the pure functions.

## Files and settings

| What     | Value                                                         |
| -------- | ------------------------------------------------------------- |
| config   | `~/.ttcrc` (JSON, zod-validated, missing keys → defaults)     |
| progress | `$XDG_DATA_HOME/ttc/progress.json` (default `~/.local/share`) |

- Progress is kept per layout profile.
- `TTC_CONFIG` and `TTC_DATA_DIR` override the locations (used in tests).
- Config keys: `layout`, `targetWpm`, `startLetters`, `homeRowFirst`,
  `stopOnError`, `uppercase`, `showTypedChar`, `unit` (`wpm` | `cpm`).
- When adding a config key, update `src/storage/config.ts`, the README's
  config example and table, and the list above.

## Adaptive engine

- A layout picks the practice language: US QWERTY, US Dvorak and US Colemak →
  English, DE QWERTZ → German.
- ttc reads characters, not physical key positions: the OS keyboard layout does
  the mapping, so the user switches their OS to the layout they practise.
- Text: pseudo-words from a letter-level n-gram (Markov) model with backoff,
  built ahead of time from public-domain text and committed as data.
- Lowercase letters only; German includes `ä ö ü ß`.
- Uppercase option: ~20% of words get a leading capital; it counts towards the
  base letter's stats.
- Unlock order: the model's letter frequency, or with `homeRowFirst` the
  layout's home-row letters first (by frequency), then the rest (by frequency).
  `getLayoutModel` returns the model with `letters` in unlock order.
- Start with `startLetters` letters (default 6). The next letter unlocks when
  every unlocked key has enough samples and a moving-average speed ≥
  `targetWpm` (default 35).
- Focus key = weakest unlocked key; most words in a line contain it.

## UI behaviour

- Menu: modes **Free** (first/default), **10 minutes**, **20 minutes**;
  settings Layout, Home row first, Uppercase, Stop on error (written back to
  `~/.ttcrc`); Reset progress (current layout, with confirmation); Quit.
- Typing screen, top to bottom:
  1. Key strip: all letters in unlock order, coloured by confidence, locked
     keys dimmed, focus key highlighted, flashes red on a miss.
  2. Current line (~10 words): typed text dim, errors red (spaces get a red
     block), cursor underlined.
  3. Metrics: WPM, accuracy, focus key, elapsed / remaining time.
- Errors: by default the cursor advances on a mistake; `stopOnError` blocks
  until the right key is typed; `showTypedChar` shows the wrongly typed char
  instead of the expected one. **Backspace is ignored** on purpose.
- Session end: timed sessions finish the current line when time runs out;
  `Esc` ends any session early. Both show a summary (WPM, accuracy, letters
  unlocked, weakest keys) and return to the menu. Progress is saved after
  every line.

## Pseudo-word models

`src/data/models/{en,de}.json` are built from the public-domain Project
Gutenberg books listed in `scripts/corpus.json`:

```sh
pnpm model:fetch  # downloads the books into ./corpus (git-ignored)
pnpm model:build
```

The model's letter order is the default unlock order, so rebuilding a model can
change what users have unlocked.

## Releasing

Releases go to npm via `.github/workflows/publish.yml` when a `v*` tag is
pushed, using npm trusted publishing (no token stored in GitHub). From `main`:

```sh
pnpm release patch   # or minor / major
```

This runs lint, typecheck and tests, bumps `package.json`, commits
"Release vX.Y.Z", tags and pushes. The workflow fails if the tag does not
match the `package.json` version.

## Roadmap

Stats screen (history is already recorded), punctuation & numbers, more
layouts/languages, layout emulation (remap keys while the OS stays on QWERTY).
