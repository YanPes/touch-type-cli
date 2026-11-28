import { describe, expect, it } from "vitest";
import { generateLine } from "./generator.ts";
import { LAYOUT_IDS, LAYOUTS, unlockOrder } from "./layouts.ts";
import { getLayoutModel, getModel } from "./models.ts";
import { seededRng } from "./rng.ts";

describe("layouts", () => {
	it("covers every letter of its language", () => {
		for (const id of LAYOUT_IDS) {
			const layout = LAYOUTS[id];
			const rowLetters = [...layout.rows.join("")].sort();
			expect(rowLetters).toEqual([...getModel(layout.language).letters].sort());
		}
	});

	it("keeps frequency order unless home row first is on", () => {
		const en = getModel("en").letters;
		expect(unlockOrder(en, LAYOUTS["us-dvorak"], false)).toEqual(en);
	});

	it("unlocks the home row first, most frequent first", () => {
		const order = getLayoutModel("us-colemak", true).letters;
		expect(new Set(order.slice(0, 10))).toEqual(new Set("arstdhneio"));
		expect(order[0]).toBe("e");
		expect(order).toHaveLength(26);
		const rest = getModel("en").letters.filter(
			(c) => !"arstdhneio".includes(c),
		);
		expect(order.slice(10)).toEqual(rest);
	});

	it("generates words from the home row alone", () => {
		for (const id of LAYOUT_IDS) {
			const model = getLayoutModel(id, true);
			const allowed = new Set(model.letters.slice(0, 6));
			const line = generateLine(model, seededRng(3), { allowed, maxChars: 60 });
			expect(line.length).toBeGreaterThan(0);
			for (const c of line.replaceAll(" ", ""))
				expect(allowed.has(c)).toBe(true);
		}
	});

	it("caches layout models", () => {
		expect(getLayoutModel("us-qwerty", true)).toBe(
			getLayoutModel("us-qwerty", true),
		);
	});
});
