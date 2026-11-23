/** State of the line currently being typed. Pure — every update returns a new object. */
export interface LineState {
	text: string;
	/** Index of the next character to type. */
	pos: number;
	/** Outcome for every position before `pos`. */
	marks: ("correct" | "error")[];
	/** What was actually typed at each position (differs from `text` on errors). */
	typed: string[];
	/** Whether the current position already received a wrong key (stop-on-error mode). */
	missedHere: boolean;
	/** Timestamp of the previous keystroke on this line. */
	lastKeyAt: number | null;
}

export interface KeyEvent {
	expected: string;
	typed: string;
	correct: boolean;
	/** Time since the previous keystroke, null for the first key of a line or after a long pause. */
	intervalMs: number | null;
	/** True when this key completed the position (always, unless blocked by stop-on-error). */
	advanced: boolean;
	/** A wrong key at a position that already had one — not counted again. */
	repeatMiss: boolean;
	/** A correct key at a position that already had a wrong key (stop-on-error mode). */
	afterMiss: boolean;
}

/** Gaps longer than this are treated as a pause and not used for speed. */
export const MAX_INTERVAL_MS = 3_000;

export const newLine = (text: string): LineState => ({
	text,
	pos: 0,
	marks: [],
	typed: [],
	missedHere: false,
	lastKeyAt: null,
});

export const isLineDone = (line: LineState): boolean =>
	line.pos >= line.text.length;

export function typeChar(
	line: LineState,
	char: string,
	now: number,
	{ stopOnError }: { stopOnError: boolean },
): { line: LineState; event: KeyEvent } | null {
	const expected = line.text[line.pos];
	if (expected === undefined) return null;

	const correct = char === expected;
	const gap = line.lastKeyAt === null ? null : now - line.lastKeyAt;
	const intervalMs = gap !== null && gap <= MAX_INTERVAL_MS ? gap : null;
	const advanced = correct || !stopOnError;
	const repeatMiss = !correct && line.missedHere;

	const next: LineState = { ...line, lastKeyAt: now };
	if (advanced) {
		next.marks = [
			...line.marks,
			correct && !line.missedHere ? "correct" : "error",
		];
		next.typed = [...line.typed, char];
		next.pos = line.pos + 1;
		next.missedHere = false;
	} else {
		next.missedHere = true;
	}
	return {
		line: next,
		event: {
			expected,
			typed: char,
			correct,
			intervalMs,
			advanced,
			repeatMiss,
			afterMiss: correct && line.missedHere,
		},
	};
}

/** Running totals for a practice session. */
export interface SessionTotals {
	/** Characters completed (positions advanced past). */
	chars: number;
	/** Positions that were typed wrong at least once. */
	errors: number;
	/** Sum of keystroke intervals, i.e. time spent actually typing. */
	activeMs: number;
}

export const emptyTotals = (): SessionTotals => ({
	chars: 0,
	errors: 0,
	activeMs: 0,
});

export function addEvent(
	totals: SessionTotals,
	event: KeyEvent,
	line: LineState,
): SessionTotals {
	const activeMs = totals.activeMs + (event.intervalMs ?? 0);
	if (!event.advanced) return { ...totals, activeMs };
	const erred = line.marks.at(-1) === "error";
	return {
		chars: totals.chars + 1,
		errors: totals.errors + (erred ? 1 : 0),
		activeMs,
	};
}

export function totalsWpm(totals: SessionTotals): number {
	return totals.activeMs > 0
		? totals.chars / 5 / (totals.activeMs / 60_000)
		: 0;
}

export function totalsAccuracy(totals: SessionTotals): number {
	return totals.chars > 0 ? (totals.chars - totals.errors) / totals.chars : 1;
}
