import { Box, Text, useApp, useInput, useWindowSize } from "ink";
import { useRef, useState } from "react";
import { LAYOUTS } from "../core/layouts.ts";
import { getLayoutModel } from "../core/models.ts";
import type { Rng } from "../core/rng.ts";
import { unlockedLetters } from "../core/stats.ts";
import { totalsAccuracy, totalsWpm } from "../core/typing.ts";
import type { Config } from "../storage/config.ts";
import {
	getProfile,
	type Profile,
	type Progress,
	setProfile,
} from "../storage/progress.ts";
import { Menu } from "./Menu.tsx";
import { Summary } from "./Summary.tsx";
import type { Mode, SessionResult } from "./session.ts";
import { TypingScreen } from "./TypingScreen.tsx";

export const MIN_COLUMNS = 60;
export const MIN_ROWS = 12;
const MAX_LINE = 70;

export interface Persistence {
	saveConfig: (config: Config) => void;
	saveProgress: (progress: Progress) => void;
}

interface Props {
	config: Config;
	progress: Progress;
	persistence: Persistence;
	initialMode?: Mode | undefined;
	notice?: string | undefined;
	rng?: Rng;
	now?: () => number;
}

type Screen =
	| { kind: "menu" }
	| { kind: "session"; mode: Mode; id: number }
	| { kind: "summary"; result: SessionResult }
	| { kind: "confirmReset" };

function ConfirmReset({
	label,
	onAnswer,
}: {
	label: string;
	onAnswer: (yes: boolean) => void;
}) {
	useInput((input, key) => {
		if (input === "y" || input === "Y") onAnswer(true);
		else if (input === "n" || input === "N" || key.escape || key.return)
			onAnswer(false);
	});
	return (
		<Box flexDirection="column" gap={1}>
			<Text>
				Reset all progress for <Text bold>{label}</Text>? This cannot be undone.
			</Text>
			<Text dimColor>y yes · n no</Text>
		</Box>
	);
}

export function App({
	config: initialConfig,
	progress: initialProgress,
	persistence,
	initialMode,
	notice,
	rng,
	now,
}: Props) {
	const { exit } = useApp();
	const { columns, rows } = useWindowSize();
	const [config, setConfig] = useState(initialConfig);
	const [progress, setProgressState] = useState(initialProgress);
	const progressRef = useRef(progress);
	const [screen, setScreen] = useState<Screen>(
		initialMode
			? { kind: "session", mode: initialMode, id: 0 }
			: { kind: "menu" },
	);
	const [message, setMessage] = useState(notice);

	const layout = LAYOUTS[config.layout];
	const model = getLayoutModel(config.layout, config.homeRowFirst);
	const profile = getProfile(progress, config.layout);

	const updateProfile = (change: (profile: Profile) => Profile) => {
		const current = progressRef.current;
		const next = setProfile(
			current,
			config.layout,
			change(getProfile(current, config.layout)),
		);
		progressRef.current = next;
		setProgressState(next);
		persistence.saveProgress(next);
	};

	const recordSession = (result: SessionResult) => {
		if (result.totals.chars === 0) return false;
		updateProfile((p) => ({
			...p,
			sessions: [
				...p.sessions,
				{
					startedAt: result.startedAt.toISOString(),
					mode: result.mode,
					durationMs: Math.round(result.durationMs),
					chars: result.totals.chars,
					errors: result.totals.errors,
					wpm: Math.round(totalsWpm(result.totals) * 10) / 10,
					accuracy: Math.round(totalsAccuracy(result.totals) * 1000) / 1000,
					unlocked: result.newlyUnlocked,
				},
			],
		}));
		return true;
	};

	const changeConfig = (next: Config) => {
		setConfig(next);
		try {
			persistence.saveConfig(next);
			setMessage(undefined);
		} catch (error) {
			setMessage(`Could not save config: ${(error as Error).message}`);
		}
	};

	if (columns < MIN_COLUMNS || rows < MIN_ROWS) {
		return (
			<Text color="yellow">
				Terminal too small ({columns}×{rows}). ttc needs at least {MIN_COLUMNS}×
				{MIN_ROWS}.
			</Text>
		);
	}

	let body: React.ReactNode;
	switch (screen.kind) {
		case "menu": {
			const unlocked = unlockedLetters(
				model,
				profile,
				config.startLetters,
			).length;
			body = (
				<Menu
					config={config}
					progressLabel={`${unlocked}/${model.letters.length} letters`}
					notice={message}
					onStart={(mode) => {
						setMessage(undefined);
						setScreen({ kind: "session", mode, id: Date.now() });
					}}
					onConfigChange={changeConfig}
					onReset={() => setScreen({ kind: "confirmReset" })}
					onQuit={exit}
				/>
			);
			break;
		}
		case "session":
			body = (
				<TypingScreen
					key={screen.id}
					model={model}
					profile={profile}
					config={config}
					mode={screen.mode}
					maxChars={Math.min(columns - 6, MAX_LINE)}
					{...(rng ? { rng } : {})}
					{...(now ? { now } : {})}
					onProgress={(learning) =>
						updateProfile((p) => ({ ...p, ...learning }))
					}
					onFinish={(result) =>
						setScreen(
							recordSession(result)
								? { kind: "summary", result }
								: { kind: "menu" },
						)
					}
					onQuit={(result) => {
						recordSession(result);
						exit();
					}}
				/>
			);
			break;
		case "summary":
			body = (
				<Summary
					result={screen.result}
					unlocked={unlockedLetters(model, profile, config.startLetters)}
					keys={profile.keys}
					config={config}
					onDone={() => setScreen({ kind: "menu" })}
				/>
			);
			break;
		case "confirmReset":
			body = (
				<ConfirmReset
					label={layout.label}
					onAnswer={(yes) => {
						if (yes) {
							updateProfile(() => ({
								unlockedCount: 0,
								keys: {},
								sessions: [],
							}));
							setMessage(`Progress for ${layout.label} was reset.`);
						}
						setScreen({ kind: "menu" });
					}}
				/>
			);
			break;
	}

	return (
		<Box paddingX={2} paddingY={1}>
			{body}
		</Box>
	);
}
