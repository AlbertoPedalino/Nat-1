import { STANDARD_LANGUAGES, EXOTIC_LANGUAGES } from '../../content/rulesVocabulary.js';

export const SPECIAL_LANGUAGES = ["Druidic", "Thieves' Cant"];

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
