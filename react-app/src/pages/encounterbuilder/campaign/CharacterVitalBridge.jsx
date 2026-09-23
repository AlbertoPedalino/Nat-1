import { useEffect, useRef } from 'react';
import { useCloudCharacterLive } from '../../../shared/cloud/sync/useCloudCharacterLive.js';
import { ensureSheetRuntimeAdapters } from '../../charsheet/state/sheetRuntimeAdapters.js';
import { summarizeCharacter } from '../../campaigns/sheetSummary.js';
import { sheetVitalsToCombat } from './sheetSync.js';

export default function CharacterVitalBridge({ charId, dispatch, refreshKey }) {
  const latest = useRef(null);
  useEffect(() => () => { latest.current = null; }, [charId]);
  useCloudCharacterLive({
    charId,
    refreshKey,
    onUpdate: (row) => {
      latest.current = row;
      ensureSheetRuntimeAdapters(row.data).then(() => {
        if (latest.current !== row) return;
        const summary = summarizeCharacter(row.data);
        if (summary) dispatch({ type: 'syncCombatantVitals', sourceId: charId, vitals: sheetVitalsToCombat(summary) });
      }).catch(() => {});
    },
  });
  return null;
}
