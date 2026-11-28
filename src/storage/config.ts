import { z } from "zod";
import { LAYOUT_IDS } from "../core/layouts.ts";
import { readIfExists, writeJsonAtomic } from "./files.ts";

export const configSchema = z.object({
	layout: z.enum(LAYOUT_IDS).default("us-qwerty"),
	/** Speed every unlocked key must reach before the next letter unlocks. */
	targetWpm: z.number().int().min(5).max(250).default(35),
	/** Number of most frequent letters to start with. */
	startLetters: z.number().int().min(2).max(30).default(6),
	/** Unlock the layout's home-row letters before any others. */
	homeRowFirst: z.boolean().default(false),
	stopOnError: z.boolean().default(false),
	uppercase: z.boolean().default(false),
	showTypedChar: z.boolean().default(false),
	unit: z.enum(["wpm", "cpm"]).default("wpm"),
});

export type Config = z.infer<typeof configSchema>;

export const defaultConfig = (): Config => configSchema.parse({});

export class ConfigError extends Error {}

export function loadConfig(path: string): Config {
	const raw = readIfExists(path);
	if (raw === undefined || raw.trim() === "") return defaultConfig();
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch (error) {
		throw new ConfigError(
			`${path} is not valid JSON: ${(error as Error).message}`,
		);
	}
	const result = configSchema.safeParse(json);
	if (!result.success) {
		const issues = result.error.issues.map(
			(i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
		);
		throw new ConfigError(
			`${path} has invalid settings:\n${issues.join("\n")}`,
		);
	}
	return result.data;
}

export function saveConfig(path: string, config: Config): void {
	writeJsonAtomic(path, config);
}
