import { homedir } from "node:os";
import { join } from "node:path";

export function configPath(env: NodeJS.ProcessEnv = process.env): string {
	return env.TTC_CONFIG ?? join(homedir(), ".ttcrc");
}

export function dataDir(env: NodeJS.ProcessEnv = process.env): string {
	if (env.TTC_DATA_DIR) return env.TTC_DATA_DIR;
	const base = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
	return join(base, "ttc");
}

export const progressPath = (env: NodeJS.ProcessEnv = process.env): string =>
	join(dataDir(env), "progress.json");
