import { useEffect, useRef } from 'react';
import { SECTION_REGISTRY } from '../../../shared/sectionRegistry.js';
import { readPersistedInstance } from '../logic/storage.js';

// The battle map writes back into this instance's saved fights — hit points,
// conditions and advantage rulings set on a piece. Without this the builder only
// ever read them at mount, so a change made on the map sat in storage until the
// page was reloaded and looked like no sync at all.
//
// Only the fight currently in play is applied, and only when it really differs:
// re-applying our own write would fight the reducer on every keystroke.

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

export function useExternalFightSync({ instanceId, instanceSaved, activeFightId, monsters, dispatch }) {
  const lastRef = useRef('');

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
}
