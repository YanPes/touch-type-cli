import de from "../data/models/de.json" with { type: "json" };
import en from "../data/models/en.json" with { type: "json" };
import type { LanguageId } from "./languages.ts";
import type { NgramModel } from "./model.ts";

const MODELS: Record<LanguageId, NgramModel> = {
	en: en as NgramModel,
	de: de as NgramModel,
};

export function getModel(language: LanguageId): NgramModel {
	return MODELS[language];
}
