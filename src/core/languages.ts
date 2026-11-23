export type LanguageId = "en" | "de";

export interface Language {
	id: LanguageId;
	name: string;
	/** Every letter the trainer can teach for this language (lowercase). */
	alphabet: readonly string[];
}

const LATIN = [..."abcdefghijklmnopqrstuvwxyz"];

export const LANGUAGES: Record<LanguageId, Language> = {
	en: { id: "en", name: "English", alphabet: LATIN },
	de: { id: "de", name: "German", alphabet: [...LATIN, "ä", "ö", "ü", "ß"] },
};
