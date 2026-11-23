import { renameSync } from "node:fs";
import { z } from "zod";
import { LAYOUT_IDS, type LayoutId } from "../core/layouts.ts";
import { readIfExists, writeJsonAtomic } from "./files.ts";

const keyStatSchema = z.object({
	samples: z.number().int().nonnegative(),
	hits: z.number().int().nonnegative(),
	misses: z.number().int().nonnegative(),
	avgMs: z.number().positive().nullable(),
});

const sessionRecordSchema = z.object({
	startedAt: z.string(),
	mode: z.enum(["free", "10", "20"]),
	durationMs: z.number().nonnegative(),
	chars: z.number().int().nonnegative(),
	errors: z.number().int().nonnegative(),
	wpm: z.number().nonnegative(),
	accuracy: z.number().min(0).max(1),
	unlocked: z.array(z.string()),
});

const profileSchema = z.object({
	unlockedCount: z.number().int().nonnegative(),
	keys: z.record(z.string(), keyStatSchema),
	sessions: z.array(sessionRecordSchema),
});

const progressSchema = z.object({
	version: z.literal(1),
	profiles: z.partialRecord(z.enum(LAYOUT_IDS), profileSchema),
});

export type SessionRecord = z.infer<typeof sessionRecordSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Progress = z.infer<typeof progressSchema>;

export const emptyProgress = (): Progress => ({ version: 1, profiles: {} });
export const emptyProfile = (): Profile => ({
	unlockedCount: 0,
	keys: {},
	sessions: [],
});

export interface LoadedProgress {
	progress: Progress;
	/** Set when an unreadable file was moved aside and progress started fresh. */
	backupPath?: string;
}

export function loadProgress(path: string): LoadedProgress {
	const raw = readIfExists(path);
	if (raw === undefined) return { progress: emptyProgress() };
	try {
		return { progress: progressSchema.parse(JSON.parse(raw)) };
	} catch {
		const backupPath = `${path}.broken-${Date.now()}`;
		renameSync(path, backupPath);
		return { progress: emptyProgress(), backupPath };
	}
}

export function saveProgress(path: string, progress: Progress): void {
	writeJsonAtomic(path, progress);
}

export const getProfile = (progress: Progress, layout: LayoutId): Profile =>
	progress.profiles[layout] ?? emptyProfile();

export const setProfile = (
	progress: Progress,
	layout: LayoutId,
	profile: Profile,
): Progress => ({
	...progress,
	profiles: { ...progress.profiles, [layout]: profile },
});
