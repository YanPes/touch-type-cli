import de from "../data/models/de.json" with { type: "json" };
import en from "../data/models/en.json" with { type: "json" };
import type { LanguageId } from "./languages.ts";
import { LAYOUTS, type LayoutId, unlockOrder } from "./layouts.ts";
import type { NgramModel } from "./model.ts";

const MODELS: Record<LanguageId, NgramModel> = {
	en: en as NgramModel,
	de: de as NgramModel,
};

export function getModel(language: LanguageId): NgramModel {
	return MODELS[language];
}

const layoutModels = new Map<string, NgramModel>();

/**
 * The language model for a layout, with `letters` in the order they unlock.
 * Cached, so the same settings always return the same object.
 */
export function getLayoutModel(
	layoutId: LayoutId,
	homeRowFirst: boolean,
): NgramModel {
	const key = `${layoutId}:${homeRowFirst}`;
	let model = layoutModels.get(key);
	if (!model) {
		const layout = LAYOUTS[layoutId];
		const base = getModel(layout.language);
		model = {
			...base,
			letters: unlockOrder(base.letters, layout, homeRowFirst),
		};
		layoutModels.set(key, model);
	}
	return model;
}
