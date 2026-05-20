import {
  entriesToHigherLevelBlocks,
  entriesToPlainText,
  entriesToTextBlocks,
  strip5eMarkup,
} from '../../../shared/character/spellEntries.js';

export { entriesToHigherLevelBlocks, entriesToPlainText, entriesToTextBlocks, strip5eMarkup };

export function renderEntries(entries) {
  return entriesToPlainText(entries);
}
