import { useCallback, useRef } from 'react';
import { commandCharacterVitals } from '../../../shared/cloud/api/cloudCharacters.js';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';

const VITAL_ACTIONS = new Set(['modifyHp', 'setHp', 'setTempHp', 'modifyTempHp', 'setMaxHp',
  'modifyMaxHp', 'setMaxHpBonus', 'setDeathSave', 'toggleCombatantCondition', 'clearCombatantConditions']);

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
      if (action.type === 'toggleCombatantCondition' && action.key === 'exhaustion') return;
      const id = String(player.sourceId);
      const vitals = vitalsRef?.current;
      commandCharacterVitals(player.sourceId, { ...action, toggle: action.type === 'setDeathSave' }, {
        digest: vitals?.digests?.get(id) ?? null,
        base: vitals?.baseMax?.get(id) ?? null,
      })
        .catch((error) => notify('error', `Health update failed: ${error.message}`));
      return;
    }
    reduce(action);
  }, [notify, reduce]);
}
