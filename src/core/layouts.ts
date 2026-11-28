import type { LanguageId } from "./languages.ts";

export const LAYOUT_IDS = [
	"us-qwerty",
	"us-dvorak",
	"us-colemak",
	"de-qwertz",
] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

/**
 * ttc reads characters, not physical key positions: the OS keyboard layout
 * maps keys to letters before they reach the terminal. A layout here therefore
 * picks the practice language and keeps its own progress profile, while the
 * user switches their OS to the same layout.
 */
export interface Layout {
	id: LayoutId;
	label: string;
	/** Practice language — pseudo-words follow this language's letter statistics. */
	language: LanguageId;
	/** Letter rows, top to bottom. The second row is the home row. */
	rows: readonly string[];
}

/**
 * The order letters unlock in. By default that is the language's frequency
 * order; with `homeRowFirst` the layout's home-row letters come first (still
 * most frequent first), followed by the rest in frequency order.
 */
export function unlockOrder(
	frequencyOrder: readonly string[],
	layout: Layout,
	homeRowFirst: boolean,
): string[] {
	if (!homeRowFirst) return [...frequencyOrder];
	const home = new Set(layout.rows[1] ?? "");
	return [
		...frequencyOrder.filter((c) => home.has(c)),
		...frequencyOrder.filter((c) => !home.has(c)),
	];
}

export const LAYOUTS: Record<LayoutId, Layout> = {
	"us-qwerty": {
		id: "us-qwerty",
		label: "US QWERTY",
		language: "en",
		rows: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
	},
	"us-dvorak": {
		id: "us-dvorak",
		label: "US Dvorak",
		language: "en",
		rows: ["pyfgcrl", "aoeuidhtns", "qjkxbmwvz"],
	},
	"us-colemak": {
		id: "us-colemak",
		label: "US Colemak",
		language: "en",
		rows: ["qwfpgjluy", "arstdhneio", "zxcvbkm"],
	},
	"de-qwertz": {
		id: "de-qwertz",
		label: "DE QWERTZ",
		language: "de",
		rows: ["qwertzuiopü", "asdfghjklöä", "yxcvbnm", "ß"],
	},
};
