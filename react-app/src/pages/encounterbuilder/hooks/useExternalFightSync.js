import { useEffect, useRef } from 'react';
import { SECTION_REGISTRY } from '../../../shared/sectionRegistry.js';
import { readPersistedInstance } from '../logic/storage.js';
import { externalDelta } from '../logic/externalSync.js';

// The battle map writes back into this instance's saved fights — hit points,
// conditions and advantage rulings set on a piece, and whole fights when a
// dungeon room is sent over from the map. Without this the builder only ever
// read them at mount, so a change made on the map sat in storage until the page
// was reloaded and looked like no sync at all.
//
// Two different repairs, because the map writes in two different places:
//
//   the fight in play  — applied through `resumeFight`, and only when it really
//                        differs: re-applying our own write would fight the
//                        reducer on every keystroke.
//   everything else    — merged into the arrays this tab holds. It has to be,
//                        not merely to be shown: this tab persists those arrays
//                        whole, so a fight it never heard about is deleted by
//                        the next save it makes.

const ENCOUNTER_SAVED = SECTION_REGISTRY.encounters.saveEvent;

function fightSignature(entry) {
  return JSON.stringify((entry?.fight?.combatants || []).map((combatant) => [
    combatant.id,
    combatant.hpCurrent,
    combatant.hpMax,
    combatant.activeConditions,
    combatant.activeEffects,
  ]));
}

export function useExternalFightSync({
  instanceId, instanceSaved, activeFightId, fights, library, monsters, dispatch,
}) {
  const lastRef = useRef('');
  // What this tab currently holds, read inside the listeners. Kept in a ref so
  // every save does not tear the listeners down and put them back.
  const heldRef = useRef({ fights, library, activeFightId });
  heldRef.current = { fights, library, activeFightId };

  useEffect(() => {
    if (!instanceId || !instanceSaved || !activeFightId) return undefined;

    const apply = () => {
      const persisted = readPersistedInstance(instanceId, monsters);
      const entry = (persisted?.fightsData?.items || [])
        .find((fight) => String(fight.id) === String(activeFightId));
      if (!entry) return;

      const signature = fightSignature(entry);
      if (signature === lastRef.current) return;
      lastRef.current = signature;
      dispatch({ type: 'resumeFight', entry, monsters });
    };

    // Seeded rather than applied: the fight on screen is already this one, and
    // dispatching on mount would reset the view for no reason.
    const persisted = readPersistedInstance(instanceId, monsters);
    const current = (persisted?.fightsData?.items || [])
      .find((fight) => String(fight.id) === String(activeFightId));
    lastRef.current = current ? fightSignature(current) : '';

    // `storage` fires for writes from other tabs, the save event for this one.
    window.addEventListener('storage', apply);
    window.addEventListener(ENCOUNTER_SAVED, apply);
    return () => {
      window.removeEventListener('storage', apply);
      window.removeEventListener(ENCOUNTER_SAVED, apply);
    };
  }, [activeFightId, dispatch, instanceId, instanceSaved, monsters]);

  useEffect(() => {
    if (!instanceId || !instanceSaved) return undefined;

    const absorb = () => {
      const delta = externalDelta(readPersistedInstance(instanceId, monsters), heldRef.current);
      if (!delta.fights.length && !delta.library.length) return;
      dispatch({ type: 'absorbExternal', ...delta });
    };

    // Not run on mount: hydration has just read the same storage, and until it
    // has this tab's arrays are empty — every fight in storage would look new.
    window.addEventListener('storage', absorb);
    window.addEventListener(ENCOUNTER_SAVED, absorb);
    return () => {
      window.removeEventListener('storage', absorb);
      window.removeEventListener(ENCOUNTER_SAVED, absorb);
    };
  }, [dispatch, instanceId, instanceSaved, monsters]);
}
