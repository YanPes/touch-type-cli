import { Box, Text } from "ink";
import type { KeyStat } from "../core/stats.ts";
import { confidence } from "../core/stats.ts";

interface Props {
	letters: readonly string[];
	unlockedCount: number;
	keys: Record<string, KeyStat>;
	targetWpm: number;
	focus: string | undefined;
	/** Letter to flash red after a miss. */
	flash: string | undefined;
}

function colorFor(level: number): string | undefined {
	if (level >= 1) return "green";
	if (level >= 0.5) return "yellow";
	if (level > 0) return "red";
	return undefined;
}

export function KeyStrip({
	letters,
	unlockedCount,
	keys,
	targetWpm,
	focus,
	flash,
}: Props) {
	return (
		<Box gap={1}>
			{letters.map((letter, i) => {
				if (letter === flash) {
					return (
						<Text key={letter} backgroundColor="red" color="white" bold>
							{letter}
						</Text>
					);
				}
				if (i >= unlockedCount) {
					return (
						<Text key={letter} dimColor>
							{letter}
						</Text>
					);
				}
				const color = colorFor(confidence(keys[letter], targetWpm));
				const isFocus = letter === focus;
				return (
					<Text
						key={letter}
						{...(color ? { color } : {})}
						bold={isFocus}
						underline={isFocus}
						inverse={isFocus}
					>
						{letter}
					</Text>
				);
			})}
		</Box>
	);
}
