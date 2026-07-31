import { loadClassAdapters, loadCoreAdapters } from '../../../adapters/index.js';
import { getFinal, getMod, getPB } from './calculations.js';

function asCharacterList(characters) {
  return Array.isArray(characters) ? characters : [characters].filter(Boolean);
}

export function collectSheetRuntimeClassNames(characters) {
  return [
    ...new Set(
      asCharacterList(characters)
        .flatMap((character) => [
          character?.className,
          ...(character?.extraClasses || []).map((extra) => extra?.name),
        ])
        .filter(Boolean),
    ),
  ];
}

// Sheet summaries, campaign rosters, and the full sheet all depend on adapter
// effects/resources/actions. Loading is best-effort: a stale chunk should degrade
// a calculation, not break the whole screen.
export async function ensureSheetRuntimeAdapters(characters) {
  const context = { getMod, getFinal, getPB };
  const classNames = collectSheetRuntimeClassNames(characters);
  return Promise.allSettled([
    loadCoreAdapters(context),
    classNames.length ? loadClassAdapters(classNames, context) : Promise.resolve(null),
  ]);
}
