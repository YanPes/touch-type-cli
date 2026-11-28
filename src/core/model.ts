import type { LanguageId } from "./languages.ts";

/** Longest context (in characters) the n-gram model conditions on. */
export const MODEL_ORDER = 3;

/** Marks the start and end of a word inside model contexts. */
export const WORD_BOUNDARY = " ";

export interface NgramModel {
	language: LanguageId;
	order: number;
	/**
	 * The language's letters, most frequent first. This is the unlock order,
	 * unless a layout reorders it (see `getLayoutModel`).
	 */
	letters: string[];
	/**
	 * context (0..order chars, boundary-padded) → next char → count.
	 * The next char may be WORD_BOUNDARY, meaning "end the word".
	 */
	transitions: Record<string, Record<string, number>>;
}
