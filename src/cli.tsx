#!/usr/bin/env node
import { parseArgs } from "node:util";
import { render } from "ink";
import pkg from "../package.json" with { type: "json" };
import {
	type Config,
	ConfigError,
	loadConfig,
	saveConfig,
} from "./storage/config.ts";
import { configPath, progressPath } from "./storage/paths.ts";
import { loadProgress, saveProgress } from "./storage/progress.ts";
import { App, MIN_COLUMNS, MIN_ROWS } from "./ui/App.tsx";
import { MODES, type Mode } from "./ui/session.ts";

const HELP = `ttc — adaptive touch-typing practice in your terminal

Usage
  ttc            open the menu
  ttc free       start an untimed session
  ttc 10         start a 10 minute session
  ttc 20         start a 20 minute session

Options
  -h, --help     show this help
  -v, --version  show the version

Files
  config    ${configPath()}
  progress  ${progressPath()}

ttc never uses the network. All data stays in the files above.`;

function fail(message: string): never {
	process.stderr.write(`ttc: ${message}\n`);
	process.exit(1);
}

function parseCli() {
	try {
		return parseArgs({
			allowPositionals: true,
			options: {
				help: { type: "boolean", short: "h" },
				version: { type: "boolean", short: "v" },
			},
		});
	} catch (error) {
		fail(`${(error as Error).message}\nRun "ttc --help" for usage.`);
	}
}

function main() {
	const args = parseCli();
	if (args.values.help) return void process.stdout.write(`${HELP}\n`);
	if (args.values.version) return void process.stdout.write(`${pkg.version}\n`);

	const [modeArg, ...rest] = args.positionals;
	if (rest.length > 0)
		fail(`unexpected argument "${rest[0]}". Run "ttc --help" for usage.`);
	if (modeArg !== undefined && !MODES.includes(modeArg as Mode)) {
		fail(`unknown mode "${modeArg}". Use one of: ${MODES.join(", ")}.`);
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY)
		fail("needs an interactive terminal (stdin and stdout must be a TTY).");
	const { columns = 0, rows = 0 } = process.stdout;
	if (columns < MIN_COLUMNS || rows < MIN_ROWS) {
		fail(
			`terminal is ${columns}×${rows}, but ttc needs at least ${MIN_COLUMNS}×${MIN_ROWS}.`,
		);
	}

	const cfgPath = configPath();
	const progPath = progressPath();
	let config: Config;
	try {
		config = loadConfig(cfgPath);
	} catch (error) {
		if (error instanceof ConfigError) fail(error.message);
		throw error;
	}
	const { progress, backupPath } = loadProgress(progPath);
	const notice = backupPath
		? `Progress file was unreadable and was moved to ${backupPath}.`
		: undefined;

	render(
		<App
			config={config}
			progress={progress}
			persistence={{
				saveConfig: (c) => saveConfig(cfgPath, c),
				saveProgress: (p) => saveProgress(progPath, p),
			}}
			initialMode={modeArg as Mode | undefined}
			notice={notice}
		/>,
		{ alternateScreen: true, exitOnCtrlC: false },
	);
}

main();
