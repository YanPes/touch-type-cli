import type { LanguageId } from "./languages.ts";

export const LAYOUT_IDS = ["us-qwerty", "de-qwertz"] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export interface Layout {
	id: LayoutId;
	label: string;
	/** Practice language — pseudo-words follow this language's letter statistics. */
	language: LanguageId;
	/** Letter rows, top to bottom (kept for a future keyboard diagram). */
	rows: readonly string[];
}

export const LAYOUTS: Record<LayoutId, Layout> = {
	"us-qwerty": {
		id: "us-qwerty",
		label: "US QWERTY",
		language: "en",
		rows: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
	},
	"de-qwertz": {
		id: "de-qwertz",
		label: "DE QWERTZ",
		language: "de",
		rows: ["qwertzuiopü", "asdfghjklöä", "yxcvbnm", "ß"],
	},
};
