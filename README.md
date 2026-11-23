# ttc — touch-type-cli

Adaptive touch-typing practice in your terminal, in the spirit of
[keybr](https://www.keybr.com/). Made for a few focused minutes between
meetings.

- Starts you on the six most frequent letters and **unlocks new letters** once
  every key you know reaches your target speed.
- Practises with **pseudo-words** that only use the letters you have unlocked,
  generated from English or German letter statistics.
- Always trains your **weakest key** (the focus key) a bit harder.
- **Fully offline.** ttc never makes a network request. Your config and progress
  are plain JSON files on your machine.

## Install

```sh
npm install -g touch-type-cli   # or: pnpm add -g touch-type-cli
ttc
```

Requires Node.js 22 or newer and an interactive terminal of at least 60×12.

## Usage

```sh
ttc        # open the menu
ttc free   # start an untimed session right away
ttc 10     # 10 minute session
ttc 20     # 20 minute session
```

**Menu:** ↑/↓ (or j/k) to move, Enter to select, ←/→ to change a setting,
q to quit. Layout, uppercase and stop-on-error changes are saved to your config.

**While typing:** just type. `Esc` ends the session and shows a summary. Timed
sessions finish the current line when time is up. Progress is saved after every
line, so quitting with Ctrl+C never loses more than the current line.

The screen shows:

```
e t o a n h i s r d l u m w c f y g p b v k x j q z   ← key strip
han the anot othe that heat enoon too honot heate     ← your line
42 wpm · 97% acc · focus h · 4:12 left                ← metrics
```

Key strip colours: dim = locked, red/yellow = learning, green = at target
speed. The focus key is highlighted, and a key flashes red when you miss it.

## Layouts

| Layout      | Practice language | Letters         |
| ----------- | ----------------- | --------------- |
| `us-qwerty` | English           | a–z             |
| `de-qwertz` | German            | a–z, ä, ö, ü, ß |

Each layout has its own progress.

## Configuration

`~/.ttcrc` (JSON). Every key is optional and the defaults are shown below:

```json
{
	"layout": "us-qwerty",
	"targetWpm": 35,
	"startLetters": 6,
	"stopOnError": false,
	"uppercase": false,
	"showTypedChar": false,
	"unit": "wpm"
}
```

| Key             | Meaning                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `layout`        | `us-qwerty` or `de-qwertz`                                                   |
| `targetWpm`     | Speed every unlocked key must reach before the next letter unlocks           |
| `startLetters`  | How many of the most frequent letters you start with                         |
| `stopOnError`   | `true` blocks on a wrong key until you type the right one                    |
| `uppercase`     | Capitalise about 20% of words to practise Shift                              |
| `showTypedChar` | Show the character you actually typed (in red) instead of the expected one   |
| `unit`          | `wpm` (words per minute, 1 word = 5 characters) or `cpm` (characters/minute) |

## Your data

| File                               | Contents                                  |
| ---------------------------------- | ----------------------------------------- |
| `~/.ttcrc`                         | Settings                                  |
| `~/.local/share/ttc/progress.json` | Per-key speed & accuracy, session history |

`$XDG_DATA_HOME` is honoured. `TTC_CONFIG` and `TTC_DATA_DIR` override the
locations. Delete the files to start over, or use "Reset progress" in the menu.

## Development

```sh
pnpm install
pnpm dev          # run from source
pnpm test         # vitest
pnpm lint         # biome
pnpm typecheck
pnpm build        # bundle to dist/ with tsdown
```

### Pseudo-word models

`src/data/models/{en,de}.json` are letter n-gram models built from public-domain
Project Gutenberg books listed in `scripts/corpus.json`. To rebuild them:

```sh
pnpm model:fetch  # downloads the books into ./corpus (git-ignored)
pnpm model:build
```

The model's letter frequency also defines the unlock order.

## License

MIT
