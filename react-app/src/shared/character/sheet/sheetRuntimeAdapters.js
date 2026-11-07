import { loadClassAdapters, loadCoreAdapters, loadSpellsAdapters } from '../../../adapters/index.js';
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

// The one way a page loads the adapters its characters need: the core ones,
// those of the given classes and, with `spells`, the spell adapters. Loading is
// best-effort: a stale chunk should degrade a calculation, not break the whole
// screen, so this never rejects.
export async function ensureClassAdapters(classNameList, { spells = false } = {}) {
  const names = [...new Set(asArray(classNameList).filter(Boolean))];
  return Promise.allSettled([
    loadCoreAdapters(),
    names.length ? loadClassAdapters(names) : Promise.resolve(null),
    spells ? loadSpellsAdapters() : Promise.resolve(null),
  ]);
}

// Sheet summaries, campaign rosters, and the full sheet all depend on adapter
// effects/resources/actions.
export async function ensureSheetRuntimeAdapters(characters, options) {
  return ensureClassAdapters(collectSheetRuntimeClassNames(characters), options);
}
