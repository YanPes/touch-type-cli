import { describe, expect, it } from "vitest";
import type { NgramModel } from "./model.ts";
import {
	confidence,
	emptyKeyStat,
	focusKey,
	type KeyStat,
	keyWpm,
	MIN_SAMPLES,
	nextUnlock,
	recordHit,
	recordMiss,
	unlockedLetters,
} from "./stats.ts";

const model: NgramModel = {
	language: "en",
	order: 3,
	letters: [..."etoanhis"],
	transitions: {},
};

function trained(ms: number, samples = MIN_SAMPLES): KeyStat {
	let stat = emptyKeyStat();
	for (let i = 0; i < samples; i++) stat = recordHit(stat, ms);
	return stat;
}

describe("key stats", () => {
	it("averages keystroke time and converts to WPM", () => {
		const stat = trained(300);
		expect(stat.avgMs).toBeCloseTo(300);
		expect(keyWpm(stat)).toBeCloseTo(40);
	});

	it("counts untimed hits and misses without touching the average", () => {
		const stat = recordMiss(recordHit(trained(300, 3), null));
		expect(stat).toMatchObject({ samples: 3, hits: 4, misses: 1 });
		expect(stat.avgMs).toBeCloseTo(300);
	});

	it("moves the average towards recent samples", () => {
		let stat = trained(600, 20);
		for (let i = 0; i < 20; i++) stat = recordHit(stat, 200);
		expect(stat.avgMs).toBeLessThan(300);
	});

	it("limits confidence by sample count", () => {
		expect(confidence(trained(100, MIN_SAMPLES / 2), 35)).toBeCloseTo(0.5);
		expect(confidence(trained(300), 35)).toBe(1);
		expect(confidence(trained(400), 35)).toBeCloseTo(30 / 35);
		expect(confidence(undefined, 35)).toBe(0);
	});
});

describe("unlocking", () => {
	const fast = trained(200); // 60 WPM

	it("starts with startLetters letters", () => {
		expect(unlockedLetters(model, { unlockedCount: 0, keys: {} }, 6)).toEqual([
			..."etoanh",
		]);
		expect(unlockedLetters(model, { unlockedCount: 7, keys: {} }, 6)).toEqual([
			..."etoanhi",
		]);
	});

	it("unlocks the next letter once every unlocked key reaches the target", () => {
		const keys = Object.fromEntries([..."etoanh"].map((c) => [c, fast]));
		expect(nextUnlock(model, { unlockedCount: 6, keys }, 6, 35)).toBe("i");
		const oneSlow = { ...keys, h: trained(600) };
		expect(
			nextUnlock(model, { unlockedCount: 6, keys: oneSlow }, 6, 35),
		).toBeUndefined();
	});

	it("never unlocks past the alphabet", () => {
		const keys = Object.fromEntries(model.letters.map((c) => [c, fast]));
		expect(
			nextUnlock(model, { unlockedCount: 8, keys }, 6, 35),
		).toBeUndefined();
	});

	it("focuses the weakest key, preferring newer letters on ties", () => {
		const keys = { e: fast, t: trained(500), o: fast };
		expect(focusKey([..."eto"], keys, 35)).toBe("t");
		expect(focusKey([..."eton"], keys, 35)).toBe("n");
		expect(focusKey([..."ea"], {}, 35)).toBe("a");
	});
});
