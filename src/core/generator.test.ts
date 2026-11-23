import { describe, expect, it } from "vitest";
import { generateLine, generateWord } from "./generator.ts";
import { getModel } from "./models.ts";
import { seededRng } from "./rng.ts";

const en = getModel("en");
const de = getModel("de");

describe("generateWord", () => {
	it("only uses allowed letters and respects length bounds", () => {
		const rng = seededRng(1);
		const allowed = new Set(en.letters.slice(0, 6));
		for (let i = 0; i < 500; i++) {
			const word = generateWord(en, allowed, rng, {
				minLength: 3,
				maxLength: 7,
			});
			expect(word.length).toBeGreaterThanOrEqual(3);
			expect(word.length).toBeLessThanOrEqual(7);
			for (const c of word) expect(allowed.has(c)).toBe(true);
		}
	});

	it("works for German letter sets including umlauts", () => {
		const rng = seededRng(2);
		const allowed = new Set([..."enirstaü"]);
		const words = Array.from({ length: 300 }, () =>
			generateWord(de, allowed, rng),
		);
		expect(words.some((w) => w.includes("ü"))).toBe(true);
		for (const w of words) for (const c of w) expect(allowed.has(c)).toBe(true);
	});

	it("is deterministic for a given seed", () => {
		const allowed = new Set(en.letters.slice(0, 10));
		const a = generateWord(en, allowed, seededRng(7));
		const b = generateWord(en, allowed, seededRng(7));
		expect(a).toBe(b);
	});
});

describe("generateLine", () => {
	const allowed = new Set(en.letters.slice(0, 8));

	it("stays within maxChars and maxWords", () => {
		const rng = seededRng(3);
		for (let i = 0; i < 50; i++) {
			const line = generateLine(en, rng, {
				allowed,
				maxChars: 40,
				maxWords: 6,
			});
			expect(line.length).toBeLessThanOrEqual(40);
			expect(line.split(" ").length).toBeLessThanOrEqual(6);
		}
	});

	it("puts the focus letter into most words", () => {
		const rng = seededRng(4);
		const words = Array.from({ length: 30 }, () =>
			generateLine(en, rng, { allowed, focus: "h", maxChars: 80 }),
		)
			.join(" ")
			.split(" ");
		const share = words.filter((w) => w.includes("h")).length / words.length;
		expect(share).toBeGreaterThan(0.6);
	});

	it("capitalises some words when uppercase is enabled", () => {
		const rng = seededRng(5);
		const text = Array.from({ length: 20 }, () =>
			generateLine(en, rng, { allowed, uppercase: true, maxChars: 80 }),
		).join(" ");
		const words = text.split(" ");
		const capitalised =
			words.filter((w) => /^[A-Z]/.test(w)).length / words.length;
		expect(capitalised).toBeGreaterThan(0.1);
		expect(capitalised).toBeLessThan(0.35);
		expect(text.slice(1)).not.toMatch(/[a-z][A-Z]/);
	});
});
