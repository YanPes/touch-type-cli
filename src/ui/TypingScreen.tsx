import { Box, Text, useInput } from "ink";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NgramModel } from "../core/model.ts";
import type { Rng } from "../core/rng.ts";
import {
	advanceLine,
	currentLetters,
	lineFinished,
	pressKey,
	startTrainer,
	type TrainerSettings,
	type TrainerState,
} from "../core/trainer.ts";
import { totalsAccuracy, totalsWpm } from "../core/typing.ts";
import type { Config } from "../storage/config.ts";
import type { Profile } from "../storage/progress.ts";
import { formatClock, formatPercent, formatSpeed } from "./format.ts";
import { KeyStrip } from "./KeyStrip.tsx";
import { type Mode, modeLimitMs, type SessionResult } from "./session.ts";
import { TextLine } from "./TextLine.tsx";

const FLASH_MS = 150;

interface Props {
	model: NgramModel;
	profile: Profile;
	config: Config;
	mode: Mode;
	maxChars: number;
	rng?: Rng;
	now?: () => number;
	/** Persist learning progress (called after every finished line). */
	onProgress: (learning: Pick<Profile, "keys" | "unlockedCount">) => void;
	onFinish: (result: SessionResult) => void;
	onQuit: (result: SessionResult) => void;
}

export function TypingScreen({
	model,
	profile,
	config,
	mode,
	maxChars,
	rng = Math.random,
	now = () => performance.now(),
	onProgress,
	onFinish,
	onQuit,
}: Props) {
	const settings: TrainerSettings = useMemo(
		() => ({
			targetWpm: config.targetWpm,
			startLetters: config.startLetters,
			stopOnError: config.stopOnError,
			uppercase: config.uppercase,
			maxChars,
		}),
		[config, maxChars],
	);
	const [state, setState] = useState<TrainerState>(() =>
		startTrainer(model, profile, settings, rng),
	);
	const stateRef = useRef(state);
	stateRef.current = state;
	const startedAt = useRef({ date: new Date(), clock: now() });
	const [elapsed, setElapsed] = useState(0);
	const [flash, setFlash] = useState<string | undefined>();
	const ended = useRef(false);
	const limit = modeLimitMs(mode);

	const result = (s: TrainerState): SessionResult => ({
		mode,
		startedAt: startedAt.current.date,
		durationMs: now() - startedAt.current.clock,
		totals: s.totals,
		newlyUnlocked: s.newlyUnlocked,
	});

	const end = (s: TrainerState, quit = false) => {
		if (ended.current) return;
		ended.current = true;
		(quit ? onQuit : onFinish)(result(s));
	};

	const endRef = useRef(end);
	endRef.current = end;
	const nowRef = useRef(now);
	nowRef.current = now;

	// Clock tick; a timed session ends here if time ran out between lines.
	useEffect(() => {
		const timer = setInterval(() => {
			const ms = nowRef.current() - startedAt.current.clock;
			setElapsed(ms);
			if (limit !== null && ms >= limit && stateRef.current.line.pos === 0)
				endRef.current(stateRef.current);
		}, 250);
		return () => clearInterval(timer);
	}, [limit]);

	// Flash the expected key red for a moment after a miss.
	useEffect(() => {
		if (!state.lastMiss) return;
		setFlash(state.lastMiss.expected);
		const timer = setTimeout(() => setFlash(undefined), FLASH_MS);
		return () => clearTimeout(timer);
	}, [state.lastMiss]);

	useInput((input, key) => {
		if (ended.current) return;
		if (key.ctrl && input === "c") return end(stateRef.current, true);
		if (key.escape) return end(stateRef.current);
		if (
			key.ctrl ||
			key.meta ||
			key.return ||
			key.tab ||
			key.backspace ||
			key.delete
		)
			return;

		let s = stateRef.current;
		for (const char of input) {
			if (char < " " || char === "\u007f") continue;
			s = pressKey(model, s, char, now(), settings);
			if (lineFinished(s)) {
				s = advanceLine(model, s, settings, rng);
				onProgress({ keys: s.keys, unlockedCount: s.unlockedCount });
				if (limit !== null && now() - startedAt.current.clock >= limit) {
					stateRef.current = s;
					setState(s);
					return end(s);
				}
			}
		}
		stateRef.current = s;
		setState(s);
	});

	const { focus } = currentLetters(model, state, settings);
	const wpm = totalsWpm(state.totals);
	const clock =
		limit === null
			? formatClock(elapsed)
			: `${formatClock(limit - elapsed)} left`;

	return (
		<Box flexDirection="column" gap={1}>
			<KeyStrip
				letters={model.letters}
				unlockedCount={state.unlockedCount}
				keys={state.keys}
				targetWpm={config.targetWpm}
				focus={focus}
				flash={flash}
			/>
			<TextLine line={state.line} showTypedChar={config.showTypedChar} />
			<Text dimColor>
				{formatSpeed(wpm, config.unit)} ·{" "}
				{formatPercent(totalsAccuracy(state.totals))} acc · focus{" "}
				<Text color="cyan">{focus ?? "-"}</Text> · {clock}
				{state.newlyUnlocked.length > 0 && (
					<Text color="green"> · new: {state.newlyUnlocked.join(" ")}</Text>
				)}
			</Text>
			<Text dimColor>esc end session</Text>
		</Box>
	);
}
