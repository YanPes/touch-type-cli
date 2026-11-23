import type { Config } from "../storage/config.ts";

export function formatSpeed(wpm: number, unit: Config["unit"]): string {
	return unit === "cpm"
		? `${Math.round(wpm * 5)} cpm`
		: `${Math.round(wpm)} wpm`;
}

export const formatPercent = (ratio: number): string =>
	`${Math.round(ratio * 100)}%`;

export function formatClock(ms: number): string {
	const total = Math.max(0, Math.round(ms / 1000));
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
