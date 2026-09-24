import { useEffect, useRef } from 'react';
import { useCharacterDigests } from '../../../shared/cloud/sync/useCharacterDigests.js';
import { sheetVitalsFromDigest } from '../../../shared/campaign/characterDigest.js';
import { sheetVitalsToCombat } from './sheetSync.js';

// Linked players' sheet vitals into the encounter: one digest channel for all
// of them (16_character_digests.sql), instead of one full-sheet subscription
// per character. A combatant is synced once its max HP is known, then again
// only when what it would receive actually changes — or when the active fight
// changes, since a newly resumed fight has not heard any of it yet.
export function useCharacterVitalSync({ characterIds, dispatch, activeFightId }) {
  const { digests, baseMax } = useCharacterDigests({ characterIds });
  const sentRef = useRef(new Map());

  useEffect(() => { sentRef.current.clear(); }, [activeFightId]);

  useEffect(() => {
    for (const [id, digest] of digests) {
      const base = baseMax.get(id)?.baseMax;
      if (!Number.isFinite(base)) continue;
      const vitals = sheetVitalsToCombat(sheetVitalsFromDigest(digest, base));
      const signature = JSON.stringify(vitals);
      if (sentRef.current.get(id) === signature) continue;
      sentRef.current.set(id, signature);
      dispatch({ type: 'syncCombatantVitals', sourceId: id, vitals });
    }
  }, [activeFightId, baseMax, digests, dispatch]);
}
