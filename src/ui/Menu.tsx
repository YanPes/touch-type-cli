import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { LAYOUT_IDS, LAYOUTS } from "../core/layouts.ts";
import type { Config } from "../storage/config.ts";
import { MODES, type Mode, modeLabel } from "./session.ts";

type Item =
	| { kind: "mode"; mode: Mode }
	| { kind: "layout" }
	| {
			kind: "toggle";
			key: "homeRowFirst" | "uppercase" | "stopOnError";
			label: string;
	  }
	| { kind: "reset" }
	| { kind: "quit" };

const ITEMS: Item[] = [
	...MODES.map((mode): Item => ({ kind: "mode", mode })),
	{ kind: "layout" },
	{ kind: "toggle", key: "homeRowFirst", label: "Home row first" },
	{ kind: "toggle", key: "uppercase", label: "Uppercase" },
	{ kind: "toggle", key: "stopOnError", label: "Stop on error" },
	{ kind: "reset" },
	{ kind: "quit" },
];

/** Items after which a separator line is drawn. */
const SEPARATE_AFTER = new Set([MODES.length - 1, MODES.length + 3]);

interface Props {
	config: Config;
	/** e.g. "8/26 letters" for the current layout. */
	progressLabel: string;
	notice?: string | undefined;
	onStart: (mode: Mode) => void;
	onConfigChange: (config: Config) => void;
	onReset: () => void;
	onQuit: () => void;
}

function nextLayout(current: Config["layout"], step: number): Config["layout"] {
	const i = LAYOUT_IDS.indexOf(current);
	return LAYOUT_IDS[
		(i + step + LAYOUT_IDS.length) % LAYOUT_IDS.length
	] as Config["layout"];
}

export function Menu({
	config,
	progressLabel,
	notice,
	onStart,
	onConfigChange,
	onReset,
	onQuit,
}: Props) {
	const [index, setIndex] = useState(0);

	const activate = (item: Item, step = 1) => {
		switch (item.kind) {
			case "mode":
				return onStart(item.mode);
			case "layout":
				return onConfigChange({
					...config,
					layout: nextLayout(config.layout, step),
				});
			case "toggle":
				return onConfigChange({ ...config, [item.key]: !config[item.key] });
			case "reset":
				return onReset();
			case "quit":
				return onQuit();
		}
	};

	useInput((input, key) => {
		const item = ITEMS[index] as Item;
		if (key.upArrow || input === "k")
			setIndex((i) => (i - 1 + ITEMS.length) % ITEMS.length);
		else if (key.downArrow || input === "j")
			setIndex((i) => (i + 1) % ITEMS.length);
		else if (key.return || input === " ") activate(item);
		else if (
			(key.leftArrow || key.rightArrow) &&
			item.kind !== "mode" &&
			item.kind !== "reset" &&
			item.kind !== "quit"
		)
			activate(item, key.leftArrow ? -1 : 1);
		else if (input === "q" || key.escape || (key.ctrl && input === "c"))
			onQuit();
	});

	const settingValue = (item: Item): string | undefined => {
		if (item.kind === "layout") return LAYOUTS[config.layout].label;
		if (item.kind === "toggle") return config[item.key] ? "on" : "off";
		return undefined;
	};

	const labelOf = (item: Item): string => {
		switch (item.kind) {
			case "mode":
				return modeLabel(item.mode);
			case "layout":
				return "Layout";
			case "toggle":
				return item.label;
			case "reset":
				return "Reset progress";
			case "quit":
				return "Quit";
		}
	};

	return (
		<Box flexDirection="column">
			<Box marginBottom={1} gap={2}>
				<Text bold color="cyan">
					ttc
				</Text>
				<Text dimColor>
					{LAYOUTS[config.layout].label} · {progressLabel} · target{" "}
					{config.targetWpm} wpm
				</Text>
			</Box>
			{ITEMS.map((item, i) => {
				const selected = i === index;
				const value = settingValue(item);
				return (
					<Box key={labelOf(item)} flexDirection="column">
						<Box>
							<Text color={selected ? "cyan" : undefined}>
								{selected ? "▸ " : "  "}
							</Text>
							<Box width={18}>
								<Text bold={selected} color={selected ? "cyan" : undefined}>
									{labelOf(item)}
								</Text>
							</Box>
							{value !== undefined && <Text dimColor={!selected}>{value}</Text>}
						</Box>
						{SEPARATE_AFTER.has(i) && (
							<Text dimColor> ────────────────────────</Text>
						)}
					</Box>
				);
			})}
			{notice && (
				<Box marginTop={1}>
					<Text color="yellow">{notice}</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text dimColor>↑↓ move · enter select · ←→ change · q quit</Text>
			</Box>
		</Box>
	);
}
