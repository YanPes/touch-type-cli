import { Text } from "ink";
import type { LineState } from "../core/typing.ts";

interface Props {
	line: LineState;
	showTypedChar: boolean;
}

type Style = "done" | "error" | "errorSpace" | "cursor" | "todo";

interface Segment {
	style: Style;
	text: string;
}

function segments(
	{ text, pos, marks, typed }: LineState,
	showTypedChar: boolean,
): Segment[] {
	const out: Segment[] = [];
	const push = (style: Style, char: string) => {
		const last = out.at(-1);
		if (last && last.style === style) last.text += char;
		else out.push({ style, text: char });
	};
	for (let i = 0; i < text.length; i++) {
		const expected = text[i] as string;
		if (i < pos) {
			if (marks[i] === "correct") push("done", expected);
			else {
				const shown = showTypedChar ? (typed[i] ?? expected) : expected;
				push(shown === " " ? "errorSpace" : "error", shown);
			}
		} else if (i === pos) push("cursor", expected);
		else push("todo", expected);
	}
	return out;
}

export function TextLine({ line, showTypedChar }: Props) {
	return (
		<Text wrap="truncate">
			{segments(line, showTypedChar).map((seg, i) => {
				const key = `${i}-${seg.style}`;
				switch (seg.style) {
					case "done":
						return (
							<Text key={key} dimColor>
								{seg.text}
							</Text>
						);
					case "error":
						return (
							<Text key={key} color="red" bold underline>
								{seg.text}
							</Text>
						);
					case "errorSpace":
						return (
							<Text key={key} backgroundColor="red">
								{seg.text}
							</Text>
						);
					case "cursor":
						return (
							<Text key={key} underline bold color="cyan">
								{seg.text}
							</Text>
						);
					default:
						return <Text key={key}>{seg.text}</Text>;
				}
			})}
		</Text>
	);
}
