import { useEffect, useRef } from 'react';
import { subscribeInstanceData } from '../../../shared/instances/instanceStore.js';
import { readPersistedInstance } from '../state/storage.js';
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
      const persisted = readPersistedInstance(instanceId, monsters);
      const entry = (persisted?.fightsData?.items || [])
        .find((fight) => String(fight.id) === String(activeFightId));
      if (!entry) return;

      const signature = fightSignature(entry);
      if (signature === lastRef.current) return;
      lastRef.current = signature;
      dispatch({ type: 'syncExternalFight', entry, monsters, preserveMonsterVitals: cloudFights });
    };

    // Seeded rather than applied: the fight on screen is already this one, and
    // dispatching on mount would reset the view for no reason.
    const persisted = readPersistedInstance(instanceId, monsters);
    const current = (persisted?.fightsData?.items || [])
      .find((fight) => String(fight.id) === String(activeFightId));
    lastRef.current = current ? fightSignature(current) : '';

    // `storage` fires for writes from other tabs, the store's feed for this one.
    window.addEventListener('storage', apply);
    const unsubscribe = subscribeInstanceData('encounters', instanceId, apply);
    return () => {
      window.removeEventListener('storage', apply);
      unsubscribe();
    };
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
    window.addEventListener('storage', absorb);
    const unsubscribe = subscribeInstanceData('encounters', instanceId, absorb);
    return () => {
      window.removeEventListener('storage', absorb);
      unsubscribe();
    };
  }, [dispatch, instanceId, monsters]);
}
