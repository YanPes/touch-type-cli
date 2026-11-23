/** A source of uniformly distributed numbers in [0, 1). `Math.random` satisfies it. */
export type Rng = () => number;

/** Small seeded PRNG (mulberry32) for reproducible tests. */
export function seededRng(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function pickWeighted<T>(
	entries: readonly (readonly [T, number])[],
	rng: Rng,
): T {
	const total = entries.reduce((sum, [, w]) => sum + w, 0);
	let roll = rng() * total;
	for (const [value, weight] of entries) {
		roll -= weight;
		if (roll < 0) return value;
	}
	const last = entries.at(-1);
	if (!last) throw new Error("pickWeighted: no entries");
	return last[0];
}
