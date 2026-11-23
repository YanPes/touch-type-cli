import { Box, Text, useInput } from "ink";
import {
	confidence,
	type KeyStat,
	keyAccuracy,
	keyWpm,
} from "../core/stats.ts";
import { totalsAccuracy, totalsWpm } from "../core/typing.ts";
import type { Config } from "../storage/config.ts";
import { formatClock, formatPercent, formatSpeed } from "./format.ts";
import { modeLabel, type SessionResult } from "./session.ts";

interface Props {
	result: SessionResult;
	unlocked: readonly string[];
	keys: Record<string, KeyStat>;
	config: Config;
	onDone: () => void;
}

export function Summary({ result, unlocked, keys, config, onDone }: Props) {
	useInput((input, key) => {
		if (
			key.return ||
			key.escape ||
			input === " " ||
			input === "q" ||
			(key.ctrl && input === "c")
		)
			onDone();
	});

	const weakest = [...unlocked]
		.sort(
			(a, b) =>
				confidence(keys[a], config.targetWpm) -
				confidence(keys[b], config.targetWpm),
		)
		.slice(0, 3);

	const rows: [string, string][] = [
		["Speed", formatSpeed(totalsWpm(result.totals), config.unit)],
		["Accuracy", formatPercent(totalsAccuracy(result.totals))],
		["Time", formatClock(result.durationMs)],
		["Characters", String(result.totals.chars)],
		[
			"New letters",
			result.newlyUnlocked.length > 0
				? result.newlyUnlocked.join(" ")
				: "none yet",
		],
	];

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Session done
				</Text>
				<Text dimColor> · {modeLabel(result.mode)}</Text>
			</Box>
			{rows.map(([label, value]) => (
				<Box key={label}>
					<Box width={14}>
						<Text dimColor>{label}</Text>
					</Box>
					<Text
						bold
						color={
							label === "New letters" && result.newlyUnlocked.length > 0
								? "green"
								: undefined
						}
					>
						{value}
					</Text>
				</Box>
			))}
			<Box marginTop={1} flexDirection="column">
				<Text dimColor>Weakest keys</Text>
				{weakest.map((c) => {
					const accuracy = keyAccuracy(keys[c]);
					return (
						<Text key={c}>
							<Text color="yellow" bold>
								{"  "}
								{c}
							</Text>
							<Text dimColor>
								{"  "}
								{formatSpeed(keyWpm(keys[c]), config.unit)} ·{" "}
								{accuracy === null ? "–" : formatPercent(accuracy)}
							</Text>
						</Text>
					);
				})}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>enter back to menu</Text>
			</Box>
		</Box>
	);
}
