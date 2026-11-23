/**
 * Builds the letter-level n-gram models in src/data/models from the texts in ./corpus.
 * Run `pnpm model:fetch` first. Usage: pnpm model:build
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGES, type LanguageId } from "../src/core/languages.ts";
import {
	MODEL_ORDER,
	type NgramModel,
	WORD_BOUNDARY,
} from "../src/core/model.ts";

/** Order-`MODEL_ORDER` transitions seen fewer times than this are dropped (noise + size). */
const MIN_TOP_ORDER_COUNT = 3;

function decode(buffer: Buffer): string {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
	} catch {
		return new TextDecoder("latin1").decode(buffer);
	}
}

function stripGutenbergBoilerplate(text: string): string {
	const start = text.search(/^\*\*\* ?START OF.*$/m);
	const end = text.search(/^\*\*\* ?END OF.*$/m);
	const from = start === -1 ? 0 : text.indexOf("\n", start) + 1;
	return text.slice(from, end === -1 ? undefined : end);
}

function buildModel(languageId: LanguageId, dir: string): NgramModel {
	const alphabet = new Set(LANGUAGES[languageId].alphabet);
	const letterCounts = new Map<string, number>();
	const table = new Map<string, Map<string, number>>();
	const pad = WORD_BOUNDARY.repeat(MODEL_ORDER);
	let tokens = 0;

	for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt"))) {
		const text = stripGutenbergBoilerplate(
			decode(readFileSync(join(dir, file))),
		)
			.normalize("NFC")
			.toLowerCase();
		for (const [word] of text.matchAll(/\p{L}+/gu)) {
			if (word.length < 2 || ![...word].every((c) => alphabet.has(c))) continue;
			tokens++;
			for (const c of word) letterCounts.set(c, (letterCounts.get(c) ?? 0) + 1);
			const padded = [...pad, ...word, WORD_BOUNDARY];
			for (let i = MODEL_ORDER; i < padded.length; i++) {
				const next = padded[i] as string;
				for (let k = 0; k <= MODEL_ORDER; k++) {
					const ctx = padded.slice(i - k, i).join("");
					let row = table.get(ctx);
					if (!row) {
						row = new Map();
						table.set(ctx, row);
					}
					row.set(next, (row.get(next) ?? 0) + 1);
				}
			}
		}
	}

	const letters = [...alphabet].sort(
		(a, b) => (letterCounts.get(b) ?? 0) - (letterCounts.get(a) ?? 0),
	);
	const transitions: NgramModel["transitions"] = {};
	for (const ctx of [...table.keys()].sort()) {
		const row = table.get(ctx) as Map<string, number>;
		const min = ctx.length === MODEL_ORDER ? MIN_TOP_ORDER_COUNT : 1;
		const kept = [...row]
			.filter(([, n]) => n >= min)
			.sort((a, b) => b[1] - a[1]);
		if (kept.length > 0) transitions[ctx] = Object.fromEntries(kept);
	}
	console.log(
		`${languageId}: ${tokens} tokens, ${Object.keys(transitions).length} contexts`,
	);
	console.log(`${languageId}: letter order ${letters.join("")}`);
	return { language: languageId, order: MODEL_ORDER, letters, transitions };
}

for (const id of Object.keys(LANGUAGES) as LanguageId[]) {
	const model = buildModel(id, join("corpus", id));
	writeFileSync(
		join("src", "data", "models", `${id}.json`),
		`${JSON.stringify(model)}\n`,
	);
}
