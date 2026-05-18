import { entriesToPlainText, entriesToTextBlocks, strip5eMarkup } from '../../../shared/character/spellEntries.js';

export { entriesToPlainText, entriesToTextBlocks, strip5eMarkup };

export function renderEntries(entries) {
  return entriesToPlainText(entries);
}
