import { useCallback, useRef } from 'react';
import { commandFromRoster } from '../../../shared/campaign/rosterHealth.js';
import { EXHAUSTION_KEY } from '../../../shared/character/combat/conditions.js';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { HP_COMMANDS, MARK_COMMANDS } from '../../../shared/encounter/combatantVitals.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';

// Everything that changes a linked player's vitals, conditions or reminders:
// all of it lives on their sheet.
const VITAL_ACTIONS = new Set([...HP_COMMANDS, 'setDeathSave', ...MARK_COMMANDS]);

// `vitalsRef.current` is `{ digests, baseMax }` from useCharacterVitalSync: a
// command starts from the digest the builder follows and the base max HP
// derived for its basis, so nothing is read before it is committed.
export function useCharacterVitalDispatch(combat, reduce, vitalsRef = null) {
  const current = useRef(combat);
  current.current = combat;
  const { notify } = useToast();
  return useCallback((action) => {
    const player = current.current?.combatants.find((c) => c.id === action.id && c.type === 'player' && c.sourceId);
    if (player && VITAL_ACTIONS.has(action.type)) {
      // Graded, and its level is the sheet's to set: not a toggle to send.
      if (action.type === 'toggleCombatantCondition' && action.key === EXHAUSTION_KEY) return;
      commandFromRoster(player.sourceId, { ...action, toggle: action.type === 'setDeathSave' }, vitalsRef?.current)
        .catch((error) => notify('error', failureMessage('Could not update hit points.', error)));
      return;
    }
    reduce(action);
  }, [notify, reduce]);
}
