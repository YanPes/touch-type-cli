import type { SessionTotals } from "../core/typing.ts";

export type Mode = "free" | "10" | "20";

export const MODES: readonly Mode[] = ["free", "10", "20"];

export const modeLimitMs = (mode: Mode): number | null =>
	mode === "free" ? null : Number(mode) * 60_000;

export const modeLabel = (mode: Mode): string =>
	mode === "free" ? "Free" : `${mode} minutes`;

export interface SessionResult {
	mode: Mode;
	startedAt: Date;
	durationMs: number;
	totals: SessionTotals;
	newlyUnlocked: string[];
}
