import { loadClassAdapters, loadCoreAdapters } from '../../../adapters/index.js';
import { asArray } from '../../lists.js';
import { classNames } from '../progression/classLevel.js';

function asCharacterList(characters) {
  return asArray(characters).filter(Boolean);
}

export function collectSheetRuntimeClassNames(characters) {
  return [
    ...new Set(
      asCharacterList(characters)
        .flatMap((character) => classNames(character)),
    ),
  ];
}

// Sheet summaries, campaign rosters, and the full sheet all depend on adapter
// effects/resources/actions. Loading is best-effort: a stale chunk should degrade
// a calculation, not break the whole screen.
export async function ensureSheetRuntimeAdapters(characters) {
  const classNames = collectSheetRuntimeClassNames(characters);
  return Promise.allSettled([
    loadCoreAdapters(),
    classNames.length ? loadClassAdapters(classNames) : Promise.resolve(null),
  ]);
}
