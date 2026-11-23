import { generateLine } from "./generator.ts";
import type { NgramModel } from "./model.ts";
import type { Rng } from "./rng.ts";
import {
	emptyKeyStat,
	focusKey,
	type KeyStat,
	type LearningState,
	nextUnlock,
	recordHit,
	recordMiss,
	unlockedLetters,
} from "./stats.ts";
import {
	addEvent,
	emptyTotals,
	isLineDone,
	type KeyEvent,
	type LineState,
	newLine,
	type SessionTotals,
	typeChar,
} from "./typing.ts";

export interface TrainerSettings {
	targetWpm: number;
	startLetters: number;
	stopOnError: boolean;
	uppercase: boolean;
	/** Longest line the screen can show. */
	maxChars: number;
}

/** Everything a running practice session needs. Pure — the UI keeps it in state. */
export interface TrainerState extends LearningState {
	line: LineState;
	totals: SessionTotals;
	/** Letters unlocked during this session, in order. */
	newlyUnlocked: string[];
	/** Set when the last key typed was wrong, for the error flash in the UI. */
	lastMiss: { expected: string; at: number } | null;
}

export function currentLetters(
	model: NgramModel,
	state: LearningState,
	settings: TrainerSettings,
) {
	const letters = unlockedLetters(model, state, settings.startLetters);
	return { letters, focus: focusKey(letters, state.keys, settings.targetWpm) };
}

function makeLine(
	model: NgramModel,
	state: LearningState,
	settings: TrainerSettings,
	rng: Rng,
): LineState {
	const { letters, focus } = currentLetters(model, state, settings);
	return newLine(
		generateLine(model, rng, {
			allowed: new Set(letters),
			focus,
			uppercase: settings.uppercase,
			maxChars: settings.maxChars,
		}),
	);
}

export function startTrainer(
	model: NgramModel,
	learning: LearningState,
	settings: TrainerSettings,
	rng: Rng,
): TrainerState {
	const state = {
		unlockedCount: unlockedLetters(model, learning, settings.startLetters)
			.length,
		keys: learning.keys,
	};
	return {
		...state,
		line: makeLine(model, state, settings, rng),
		totals: emptyTotals(),
		newlyUnlocked: [],
		lastMiss: null,
	};
}

function updateKeys(
	keys: Record<string, KeyStat>,
	event: KeyEvent,
	alphabet: ReadonlySet<string>,
) {
	const letter = event.expected.toLowerCase();
	if (!alphabet.has(letter)) return keys;
	const stat = keys[letter] ?? emptyKeyStat();
	if (event.correct) {
		return {
			...keys,
			[letter]: recordHit(stat, event.afterMiss ? null : event.intervalMs),
		};
	}
	if (event.repeatMiss) return keys;
	return { ...keys, [letter]: recordMiss(stat) };
}

/** Applies one typed character. Returns the same state object if the key was ignored. */
export function pressKey(
	model: NgramModel,
	state: TrainerState,
	char: string,
	now: number,
	settings: TrainerSettings,
): TrainerState {
	const result = typeChar(state.line, char, now, settings);
	if (!result) return state;
	const { line, event } = result;
	return {
		...state,
		line,
		keys: updateKeys(state.keys, event, new Set(model.letters)),
		totals: addEvent(state.totals, event, line),
		lastMiss: event.correct
			? state.lastMiss
			: { expected: event.expected.toLowerCase(), at: now },
	};
}

export const lineFinished = (state: TrainerState): boolean =>
	isLineDone(state.line);

/** Called after a finished line: unlocks a letter if earned and deals the next line. */
export function advanceLine(
	model: NgramModel,
	state: TrainerState,
	settings: TrainerSettings,
	rng: Rng,
): TrainerState {
	const unlock = nextUnlock(
		model,
		state,
		settings.startLetters,
		settings.targetWpm,
	);
	const next = unlock
		? {
				...state,
				unlockedCount: state.unlockedCount + 1,
				newlyUnlocked: [...state.newlyUnlocked, unlock],
			}
		: state;
	return { ...next, line: makeLine(model, next, settings, rng) };
}
