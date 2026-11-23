import type { NgramModel } from "./model.ts";

export interface KeyStat {
	/** Timed correct hits that fed the speed average. */
	samples: number;
	hits: number;
	misses: number;
	/** Moving average of milliseconds per keystroke, null until the first timed hit. */
	avgMs: number | null;
}

/** A key must have at least this many timed hits before it counts as learned. */
export const MIN_SAMPLES = 10;
/** Weight of the newest sample once the average has warmed up. */
const SMOOTHING = 0.1;

export const emptyKeyStat = (): KeyStat => ({
	samples: 0,
	hits: 0,
	misses: 0,
	avgMs: null,
});

/** Characters per minute ÷ 5. One "word" is five keystrokes. */
export const msToWpm = (ms: number): number => (ms > 0 ? 12_000 / ms : 0);

export function recordHit(stat: KeyStat, intervalMs: number | null): KeyStat {
	const hits = stat.hits + 1;
	if (intervalMs === null) return { ...stat, hits };
	const samples = stat.samples + 1;
	// Plain mean while warming up, exponential moving average afterwards.
	const weight = Math.max(1 / samples, SMOOTHING);
	const avgMs =
		stat.avgMs === null
			? intervalMs
			: stat.avgMs + weight * (intervalMs - stat.avgMs);
	return { samples, hits, misses: stat.misses, avgMs };
}

export const recordMiss = (stat: KeyStat): KeyStat => ({
	...stat,
	misses: stat.misses + 1,
});

export const keyWpm = (stat: KeyStat | undefined): number =>
	stat?.avgMs ? msToWpm(stat.avgMs) : 0;

export function keyAccuracy(stat: KeyStat | undefined): number | null {
	if (!stat || stat.hits + stat.misses === 0) return null;
	return stat.hits / (stat.hits + stat.misses);
}

/**
 * How close a key is to being learned, 0 … 1 (and above).
 * Limited by both speed relative to the target and the number of samples.
 */
export function confidence(
	stat: KeyStat | undefined,
	targetWpm: number,
): number {
	if (!stat) return 0;
	return Math.min(keyWpm(stat) / targetWpm, stat.samples / MIN_SAMPLES);
}

export interface LearningState {
	unlockedCount: number;
	keys: Record<string, KeyStat>;
}

export function unlockedLetters(
	model: NgramModel,
	state: LearningState,
	startLetters: number,
): string[] {
	const count = Math.min(
		model.letters.length,
		Math.max(startLetters, state.unlockedCount),
	);
	return model.letters.slice(0, count);
}

/** The next letter to unlock, if every unlocked key has reached the target. */
export function nextUnlock(
	model: NgramModel,
	state: LearningState,
	startLetters: number,
	targetWpm: number,
): string | undefined {
	const unlocked = unlockedLetters(model, state, startLetters);
	if (unlocked.length >= model.letters.length) return undefined;
	const allLearned = unlocked.every(
		(c) => confidence(state.keys[c], targetWpm) >= 1,
	);
	return allLearned ? model.letters[unlocked.length] : undefined;
}

/** The weakest unlocked key; ties go to the most recently unlocked letter. */
export function focusKey(
	unlocked: readonly string[],
	keys: Record<string, KeyStat>,
	targetWpm: number,
): string | undefined {
	let best: string | undefined;
	let bestScore = Number.POSITIVE_INFINITY;
	for (const c of unlocked) {
		const score = confidence(keys[c], targetWpm);
		if (score <= bestScore) {
			best = c;
			bestScore = score;
		}
	}
	return best;
}
