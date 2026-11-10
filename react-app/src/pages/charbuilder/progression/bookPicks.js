import { isBookAllowed } from '../../../shared/content/sourcePriority.js';
import { asArray } from '../../../shared/lists.js';

// What the character already took from a book it no longer uses: kept, but
// listed so the player can change it.
export function picksFromUnusedBooks(character) {
  const picks = [
    [character?.className, character?.classSource],
    [character?.subclassShortName, character?.subclassSource],
    ...asArray(character?.extraClasses).flatMap((extra) => [[extra?.name, extra?.source], [extra?.subclassShortName, extra?.subclassSource]]),
    [character?.speciesName, character?.speciesSource],
    [character?.backgroundName, character?.backgroundSource],
    ...asArray(character?.allFeatSnapshots).map((feat) => [feat?.name, feat?.source]),
  ];
  return picks
    .filter(([name, source]) => name && source && !isBookAllowed(character, source))
    .map(([name, source]) => `${name} (${source})`);
}
