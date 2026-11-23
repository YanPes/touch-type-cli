import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { seededRng } from "../core/rng.ts";
import { defaultConfig } from "../storage/config.ts";
import { emptyProgress, type Progress } from "../storage/progress.ts";
import { App } from "./App.tsx";

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
const ENTER = "\r";
const ESC = "\u001b";
const DOWN = "\u001b[B";

function setup(initialMode?: "free" | "10" | "20") {
	const saveConfig = vi.fn();
	const saveProgress = vi.fn<(p: Progress) => void>();
	let clock = 0;
	const app = render(
		<App
			config={defaultConfig()}
			progress={emptyProgress()}
			persistence={{ saveConfig, saveProgress }}
			initialMode={initialMode}
			rng={seededRng(1)}
			now={() => clock}
		/>,
	);
	const advance = (ms: number) => {
		clock += ms;
	};
	return { ...app, saveConfig, saveProgress, advance };
}

/** The line being typed, read back from the rendered frame (third non-empty line). */
function currentLine(frame: string): string {
	const lines = frame.split("\n").filter((l) => l.trim() !== "");
	return (lines[1] ?? "").trim();
}

describe("App", () => {
	it("shows the menu with Free first", () => {
		const { lastFrame } = setup();
		const frame = lastFrame() ?? "";
		expect(frame).toContain("▸ Free");
		expect(frame).toContain("10 minutes");
		expect(frame).toContain("US QWERTY");
	});

	it("toggles settings in the menu and saves them", async () => {
		const { stdin, lastFrame, saveConfig } = setup();
		await tick();
		for (let i = 0; i < 3; i++) {
			stdin.write(DOWN);
			await tick();
		}
		stdin.write(ENTER); // Layout
		await tick();
		expect(saveConfig).toHaveBeenLastCalledWith(
			expect.objectContaining({ layout: "de-qwertz" }),
		);
		expect(lastFrame()).toContain("DE QWERTZ");
		stdin.write(DOWN);
		await tick();
		stdin.write(ENTER); // Uppercase
		await tick();
		expect(saveConfig).toHaveBeenLastCalledWith(
			expect.objectContaining({ uppercase: true }),
		);
	});

	it("runs a session: typing a line saves progress, esc shows the summary", async () => {
		const { stdin, lastFrame, saveProgress, advance } = setup("free");
		await tick();
		const text = currentLine(lastFrame() ?? "");
		expect(text.length).toBeGreaterThan(5);
		for (const char of text) {
			advance(250);
			stdin.write(char);
			await tick();
		}
		expect(saveProgress).toHaveBeenCalled();
		const saved = saveProgress.mock.lastCall?.[0];
		expect(
			Object.keys(saved?.profiles["us-qwerty"]?.keys ?? {}).length,
		).toBeGreaterThan(2);

		stdin.write(ESC);
		await tick();
		const frame = lastFrame() ?? "";
		expect(frame).toContain("Session done");
		expect(frame).toContain("48 wpm");
		expect(frame).toContain("100%");
		const final = saveProgress.mock.lastCall?.[0];
		expect(final?.profiles["us-qwerty"]?.sessions).toHaveLength(1);

		stdin.write(ENTER);
		await tick();
		expect(lastFrame()).toContain("▸ Free");
	});

	it("finishes the current line when a timed session runs out, then shows the summary", async () => {
		const { stdin, lastFrame, advance } = setup("10");
		await tick();
		const text = currentLine(lastFrame() ?? "");
		const [first, ...rest] = [...text];
		advance(200);
		stdin.write(first as string);
		advance(10 * 60_000);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(lastFrame()).toContain("0:00 left");
		for (const char of rest) {
			advance(200);
			stdin.write(char);
			await tick();
		}
		expect(lastFrame()).toContain("Session done");
		expect(lastFrame()).toContain("10 minutes");
	});

	it("goes straight back to the menu when nothing was typed", async () => {
		const { stdin, lastFrame, saveProgress } = setup("free");
		await tick();
		stdin.write(ESC);
		await tick();
		expect(lastFrame()).toContain("▸ Free");
		expect(saveProgress).not.toHaveBeenCalled();
	});

	it("resets progress only after confirmation", async () => {
		const { stdin, lastFrame, saveProgress } = setup();
		await tick();
		for (let i = 0; i < 6; i++) {
			stdin.write(DOWN);
			await tick();
		}
		stdin.write(ENTER);
		await tick();
		expect(lastFrame()).toContain("Reset all progress for");
		stdin.write("n");
		await tick();
		expect(saveProgress).not.toHaveBeenCalled();
		for (let i = 0; i < 6; i++) {
			stdin.write(DOWN);
			await tick();
		}
		stdin.write(ENTER);
		await tick();
		stdin.write("y");
		await tick();
		expect(saveProgress).toHaveBeenCalledOnce();
		expect(lastFrame()).toContain("was reset");
	});
});
