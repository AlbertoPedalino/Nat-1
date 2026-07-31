import { STANDARD_LANGUAGES, EXOTIC_LANGUAGES, ALL_LANGUAGES } from '../../adapters/gameData.js';

export { STANDARD_LANGUAGES, EXOTIC_LANGUAGES, ALL_LANGUAGES };

export const SPECIAL_LANGUAGES = ["Druidic", "Thieves' Cant"];

export function isStandardLanguage(language) {
  return STANDARD_LANGUAGES.some((l) => l.toLowerCase() === String(language).toLowerCase());
}

export function isExoticLanguage(language) {
  return EXOTIC_LANGUAGES.some((l) => l.toLowerCase() === String(language).toLowerCase());
}

export function isSpecialLanguage(language) {
  return SPECIAL_LANGUAGES.some((l) => l.toLowerCase() === String(language).toLowerCase());
}

export function getLanguageOptions({ allowRare = false, allowSpecial = false, includeCommon = true } = {}) {
  let langs = [...STANDARD_LANGUAGES];
  if (!includeCommon) {
    langs = langs.filter((l) => l !== 'Common');
  }
  if (allowRare) {
    langs.push(...EXOTIC_LANGUAGES);
  }
  if (allowSpecial) {
    langs.push(...SPECIAL_LANGUAGES);
  }
  return langs;
}
