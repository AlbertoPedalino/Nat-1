import { useEffect, useRef } from 'react';
import { followInstanceData } from '../../../shared/instances/instanceStore.js';
import { readPersistedFight, readPersistedInstance } from '../state/storage.js';
import { externalDelta } from './externalSync.js';

// The battle map writes back into this instance's saved fights — hit points,
// conditions and advantage rulings set on a piece, and whole fights when a
// dungeon room is sent over from the map. Without this the builder only ever
// read them at mount, so a change made on the map sat in storage until the page
// was reloaded and looked like no sync at all.
//
// Two different repairs, because the map writes in two different places:
//
//   the fight in play  — applied through `syncExternalFight`, preserving sheet
//                        vitals for linked players, and only when it really
//                        differs: re-applying our own write would fight the
//                        reducer on every keystroke.
//   everything else    — merged into the arrays this tab holds. It has to be,
//                        not merely to be shown: this tab persists those arrays
//                        whole, so a fight it never heard about is deleted by
//                        the next save it makes.

// The vitals of a fight's combatants, to tell a real change from an echo.
function combatantVitalsSignature(entry) {
  return JSON.stringify((entry?.fight?.combatants || []).map((combatant) => [
    combatant.id,
    combatant.hpCurrent,
    combatant.hpMax,
    combatant.activeConditions,
    combatant.activeEffects,
  ]));
}

export function useExternalFightSync({
  instanceId, activeFightId, fights, library, monsters, dispatch, cloudFights = false,
}) {
  const lastRef = useRef('');
  // What this tab currently holds, read inside the listeners. Kept in a ref so
  // every save does not tear the listeners down and put them back.
  const heldRef = useRef({ fights, library, activeFightId });
  heldRef.current = { fights, library, activeFightId };

  useEffect(() => {
    if (!instanceId || !activeFightId) return undefined;

    const apply = () => {
      const entry = readPersistedFight(instanceId, activeFightId, monsters);
      if (!entry) return;

      const signature = combatantVitalsSignature(entry);
      if (signature === lastRef.current) return;
      lastRef.current = signature;
      dispatch({ type: 'syncExternalFight', entry, monsters, preserveMonsterVitals: cloudFights });
    };

    // Seeded rather than applied: the fight on screen is already this one, and
    // dispatching on mount would reset the view for no reason.
    const current = readPersistedFight(instanceId, activeFightId, monsters);
    lastRef.current = current ? combatantVitalsSignature(current) : '';

    return followInstanceData('encounters', instanceId, apply);
  }, [activeFightId, cloudFights, dispatch, instanceId, monsters]);

  useEffect(() => {
    if (!instanceId) return undefined;

    const absorb = () => {
      const delta = externalDelta(readPersistedInstance(instanceId, monsters), heldRef.current);
      if (!delta.fights.length && !delta.library.length) return;
      dispatch({ type: 'absorbExternal', ...delta });
    };

    // Not run on mount: hydration has just read the same storage, and until it
    // has this tab's arrays are empty — every fight in storage would look new.
    return followInstanceData('encounters', instanceId, absorb);
  }, [dispatch, instanceId, monsters]);
}
