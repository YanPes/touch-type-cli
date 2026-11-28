import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
	ConfigError,
	defaultConfig,
	loadConfig,
	saveConfig,
} from "./config.ts";
import { dataDir } from "./paths.ts";
import {
	emptyProfile,
	getProfile,
	loadProgress,
	saveProgress,
	setProfile,
} from "./progress.ts";

let dir: string;
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "ttc-test-"));
});

describe("config", () => {
	it("returns defaults when the file is missing", () => {
		expect(loadConfig(join(dir, ".ttcrc"))).toEqual(defaultConfig());
		expect(defaultConfig()).toMatchObject({
			layout: "us-qwerty",
			targetWpm: 35,
			startLetters: 6,
			homeRowFirst: false,
		});
	});

	it("fills in missing keys", () => {
		const path = join(dir, ".ttcrc");
		writeFileSync(path, JSON.stringify({ layout: "de-qwertz", targetWpm: 50 }));
		expect(loadConfig(path)).toEqual({
			...defaultConfig(),
			layout: "de-qwertz",
			targetWpm: 50,
		});
	});

	it("round-trips through save", () => {
		const path = join(dir, "nested", ".ttcrc");
		const config = { ...defaultConfig(), uppercase: true };
		saveConfig(path, config);
		expect(loadConfig(path)).toEqual(config);
	});

	it("reports invalid JSON and invalid values", () => {
		const path = join(dir, ".ttcrc");
		writeFileSync(path, "{ nope");
		expect(() => loadConfig(path)).toThrow(ConfigError);
		writeFileSync(path, JSON.stringify({ layout: "workman" }));
		expect(() => loadConfig(path)).toThrow(/layout/);
	});
});

describe("progress", () => {
	it("starts empty and round-trips per layout", () => {
		const path = join(dir, "progress.json");
		const { progress } = loadProgress(path);
		const profile = { ...emptyProfile(), unlockedCount: 8 };
		saveProgress(path, setProfile(progress, "de-qwertz", profile));
		const loaded = loadProgress(path).progress;
		expect(getProfile(loaded, "de-qwertz").unlockedCount).toBe(8);
		expect(getProfile(loaded, "us-qwerty")).toEqual(emptyProfile());
	});

	it("moves a corrupt file aside instead of crashing", () => {
		const path = join(dir, "progress.json");
		writeFileSync(path, "garbage");
		const { progress, backupPath } = loadProgress(path);
		expect(progress.profiles).toEqual({});
		expect(backupPath && readFileSync(backupPath, "utf8")).toBe("garbage");
		expect(existsSync(path)).toBe(false);
	});
});

describe("paths", () => {
	it("honours overrides and XDG_DATA_HOME", () => {
		expect(dataDir({ TTC_DATA_DIR: "/x" })).toBe("/x");
		expect(dataDir({ XDG_DATA_HOME: "/data" })).toBe("/data/ttc");
	});
});
