import { describe, expect, it } from "vitest";
import { getModel } from "./models.ts";
import { seededRng } from "./rng.ts";
import { emptyKeyStat, MIN_SAMPLES, recordHit } from "./stats.ts";
import {
	advanceLine,
	lineFinished,
	pressKey,
	startTrainer,
	type TrainerSettings,
} from "./trainer.ts";
import { totalsAccuracy, totalsWpm } from "./typing.ts";

const model = getModel("en");
const settings: TrainerSettings = {
	targetWpm: 35,
	startLetters: 6,
	stopOnError: false,
	uppercase: false,
	maxChars: 60,
};

function typeLine(
	state: ReturnType<typeof startTrainer>,
	msPerKey: number,
	start = 0,
) {
	let s = state;
	let now = start;
	for (const c of s.line.text) {
		s = pressKey(model, s, c, now, settings);
		now += msPerKey;
	}
	return { state: s, now };
}

describe("trainer", () => {
	it("generates lines from the first startLetters letters", () => {
		const state = startTrainer(
			model,
			{ unlockedCount: 0, keys: {} },
			settings,
			seededRng(1),
		);
		const allowed = new Set([...model.letters.slice(0, 6), " "]);
		for (const c of state.line.text) expect(allowed.has(c)).toBe(true);
		expect(state.unlockedCount).toBe(6);
	});

	it("tracks speed and accuracy over a typed line", () => {
		const start = startTrainer(
			model,
			{ unlockedCount: 0, keys: {} },
			settings,
			seededRng(2),
		);
		const { state } = typeLine(start, 200);
		expect(lineFinished(state)).toBe(true);
		// The first key of a line has no interval, so the rate is slightly above 60.
		expect(totalsWpm(state.totals)).toBeGreaterThan(59);
		expect(totalsWpm(state.totals)).toBeLessThan(63);
		expect(totalsAccuracy(state.totals)).toBe(1);
	});

	it("records a miss on the expected letter and advances by default", () => {
		const start = startTrainer(
			model,
			{ unlockedCount: 0, keys: {} },
			settings,
			seededRng(3),
		);
		const expected = start.line.text[0] as string;
		const state = pressKey(model, start, "#", 0, settings);
		expect(state.line.pos).toBe(1);
		expect(state.keys[expected]?.misses).toBe(1);
		expect(state.lastMiss?.expected).toBe(expected);
		expect(totalsAccuracy(state.totals)).toBe(0);
	});

	it("blocks on a mistake with stopOnError and counts it once", () => {
		const strict = { ...settings, stopOnError: true };
		const start = startTrainer(
			model,
			{ unlockedCount: 0, keys: {} },
			strict,
			seededRng(4),
		);
		const expected = start.line.text[0] as string;
		let state = pressKey(model, start, "#", 0, strict);
		state = pressKey(model, state, "#", 100, strict);
		expect(state.line.pos).toBe(0);
		state = pressKey(model, state, expected, 200, strict);
		expect(state.line.pos).toBe(1);
		expect(state.line.marks).toEqual(["error"]);
		expect(state.keys[expected]).toMatchObject({
			misses: 1,
			hits: 1,
			samples: 0,
		});
	});

	it("unlocks the next letter after a line once all keys are fast enough", () => {
		let fast = emptyKeyStat();
		for (let i = 0; i < MIN_SAMPLES; i++) fast = recordHit(fast, 200);
		const keys = Object.fromEntries(
			model.letters.slice(0, 6).map((c) => [c, fast]),
		);
		const start = startTrainer(
			model,
			{ unlockedCount: 6, keys },
			settings,
			seededRng(5),
		);
		const { state } = typeLine(start, 200);
		const next = advanceLine(model, state, settings, seededRng(6));
		expect(next.unlockedCount).toBe(7);
		expect(next.newlyUnlocked).toEqual([model.letters[6]]);
		expect(next.line.pos).toBe(0);
	});
});
