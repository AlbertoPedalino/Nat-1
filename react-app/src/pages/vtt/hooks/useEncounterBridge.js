import { useCallback, useEffect, useRef } from 'react';
import { SECTION_REGISTRY } from '../../../shared/sectionRegistry.js';
import { persistFights, readPersistedInstance, readRegistry } from '../../encounterbuilder/logic/storage.js';
import { restoreFight } from '../../encounterbuilder/logic/combat.js';
import {
  fightWithTokenVitals,
  parseSourceRef,
  tokenUpdatesFromFight,
} from '../../../shared/vtt/encounterSync.js';

// The bridge between a cloud scene and a local-first encounter.
//
// There is no server that can see both: encounters live in this browser, scenes
// live in Postgres. So the sync only happens where both are visible at once —
// this tab, plus any other tab of the same browser via the storage event. Close
// the encounter builder and the map simply stops hearing about hit points.
//
// Both directions guard against echoing: an update is only written when the
// value actually differs, so a change does not bounce between the two forever.

const ENCOUNTER_SAVED = SECTION_REGISTRY.encounters.saveEvent;

function readFight(instanceId, fightId) {
  const persisted = readPersistedInstance(instanceId, []);
  const fights = persisted?.fightsData?.items || [];
  const entry = fights.find((fight) => String(fight.id) === String(fightId));
  return entry ? { fights, entry, activeFightId: persisted.fightsData.activeFightId } : null;
}

export function useEncounterBridge({ tokens, onTokenVitals }) {
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  // Encounter -> map. Every imported piece's fight is re-read on a save and the
  // differences are applied; there is no finer signal to listen to.
  const pull = useCallback(() => {
    const tokens = tokensRef.current || [];
    const refs = new Map();
    for (const token of tokens) {
      const ref = parseSourceRef(token.sourceRef);
      if (ref) refs.set(`${ref.instanceId}:${ref.fightId}`, ref);
    }

    // A character's piece is placed from the party roster, so it carries no
    // reference to a fight — it is matched to a combatant by the sheet it stands
    // for. Without this, a scene with only player pieces heard nothing from the
    // encounter at all.
    if (tokens.some((token) => token.characterId)) {
      for (const instance of readRegistry()) {
        const persisted = readPersistedInstance(instance.id, []);
        const activeFightId = persisted?.fightsData?.activeFightId;
        if (activeFightId) {
          refs.set(`${instance.id}:${activeFightId}`, {
            instanceId: instance.id,
            fightId: String(activeFightId),
          });
        }
      }
    }

    if (!refs.size) return;

    for (const ref of refs.values()) {
      const found = readFight(ref.instanceId, ref.fightId);
      if (!found) continue;
      const combat = restoreFight(found.entry, []);
      const updates = tokenUpdatesFromFight(tokensRef.current, {
        instanceId: ref.instanceId,
        fightId: ref.fightId,
        combatants: combat?.combatants || [],
      });
      if (updates.length) onTokenVitals(updates);
    }
  }, [onTokenVitals]);

  useEffect(() => {
    // Same tab: the encounter builder dispatches this on every persist.
    window.addEventListener(ENCOUNTER_SAVED, pull);
    // Other tabs of this browser: localStorage writes surface as `storage`.
    window.addEventListener('storage', pull);
    pull();
    return () => {
      window.removeEventListener(ENCOUNTER_SAVED, pull);
      window.removeEventListener('storage', pull);
    };
  }, [pull]);

  // Map -> encounter. Called after the GM edits a piece's hit points.
  const push = useCallback((token) => {
    const ref = parseSourceRef(token?.sourceRef);
    const targets = ref ? [ref] : [];
    // Character pieces are placed from the roster and therefore have no fight
    // reference. Send them to every active fight that can match their sourceId;
    // fightWithTokenVitals is the guard that ignores unrelated encounters.
    if (!ref && token?.characterId) {
      for (const instance of readRegistry()) {
        const persisted = readPersistedInstance(instance.id, []);
        if (!persisted?.fightsData?.activeFightId) continue;
        targets.push({
          instanceId: instance.id,
          fightId: String(persisted.fightsData.activeFightId),
        });
      }
    }

    for (const target of targets) {
      const found = readFight(target.instanceId, target.fightId);
      if (!found) continue;
      const combatants = fightWithTokenVitals(found.entry.fight?.combatants, token);
      if (!combatants) continue;

      const fights = found.fights.map((fight) => (
        String(fight.id) === String(target.fightId)
          ? { ...fight, fight: { ...fight.fight, combatants }, savedAt: Date.now() }
          : fight
      ));
      // Writing through the encounter builder's own persist keeps its event and
      // its shape, so an open builder tab reacts exactly as if it had saved.
      persistFights(target.instanceId, found.activeFightId, fights);
    }
  }, []);

  return { push, pull };
}
