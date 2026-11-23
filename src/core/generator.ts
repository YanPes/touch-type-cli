import { type NgramModel, WORD_BOUNDARY } from "./model.ts";
import { pickWeighted, type Rng } from "./rng.ts";

export interface WordOptions {
	minLength?: number;
	maxLength?: number;
}

export interface LineOptions extends WordOptions {
	/** Letters the generated text may use. */
	allowed: ReadonlySet<string>;
	/** Letter that most words should contain (the user's weakest key). */
	focus?: string | undefined;
	/** Capitalise the first letter of roughly `uppercaseRatio` of the words. */
	uppercase?: boolean;
	uppercaseRatio?: number;
	/** Share of words that must contain the focus letter. */
	focusRatio?: number;
	/** Upper bound on the line length in characters (spaces included). */
	maxChars?: number;
	maxWords?: number;
}

const FOCUS_ATTEMPTS = 40;

/**
 * Generates one pseudo-word from the n-gram model, using only `allowed` letters.
 * Falls back to shorter contexts when the longer ones offer no allowed continuation.
 */
export function generateWord(
	model: NgramModel,
	allowed: ReadonlySet<string>,
	rng: Rng,
	{ minLength = 3, maxLength = 8 }: WordOptions = {},
): string {
	const chars: string[] = [];
	const history = Array.from({ length: model.order }, () => WORD_BOUNDARY);

	for (;;) {
		const mustContinue = chars.length < minLength;
		const mustEnd = chars.length >= maxLength;
		let options: [string, number][] = [];

		for (let k = model.order; k >= 0 && options.length === 0; k--) {
			const ctx = history.slice(history.length - k).join("");
			const row = model.transitions[ctx];
			if (!row) continue;
			options = Object.entries(row).filter(([c]) => {
				if (c === WORD_BOUNDARY) return !mustContinue;
				return !mustEnd && allowed.has(c);
			});
		}

		if (options.length === 0) {
			if (mustEnd || chars.length > 0) break;
			// No model data at all for these letters: sample them uniformly.
			options = [...allowed].map((c) => [c, 1]);
		}

		const next = pickWeighted(options, rng);
		if (next === WORD_BOUNDARY) break;
		chars.push(next);
		history.push(next);
	}
	return chars.join("");
}

function capitalise(word: string): string {
	const first = word[0];
	// "ß".toUpperCase() is "SS" — leave such words alone.
	if (!first || first === "ß") return word;
	return first.toUpperCase() + word.slice(1);
}

/** Generates a line of space-separated pseudo-words. */
export function generateLine(
	model: NgramModel,
	rng: Rng,
	options: LineOptions,
): string {
	const {
		allowed,
		focus,
		uppercase = false,
		uppercaseRatio = 0.2,
		focusRatio = 0.7,
		maxChars = 60,
		maxWords = 10,
	} = options;
	const words: string[] = [];
	let length = 0;

	while (words.length < maxWords) {
		const wantFocus =
			focus !== undefined && allowed.has(focus) && rng() < focusRatio;
		let word = generateWord(model, allowed, rng, options);
		for (let i = 0; i < FOCUS_ATTEMPTS; i++) {
			const fresh = !words.some((w) => w.toLowerCase() === word);
			if (fresh && (!wantFocus || word.includes(focus))) break;
			word = generateWord(model, allowed, rng, options);
		}
		if (uppercase && rng() < uppercaseRatio) word = capitalise(word);

		const added = (words.length > 0 ? 1 : 0) + word.length;
		if (words.length > 0 && length + added > maxChars) break;
		words.push(word);
		length += added;
	}
	return words.join(" ");
}
