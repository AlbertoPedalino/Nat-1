import { useCallback, useRef } from 'react';
import { commandCharacterVitals } from '../../../shared/cloud/api/cloudCharacters.js';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';

const VITAL_ACTIONS = new Set(['modifyHp', 'setHp', 'setTempHp', 'modifyTempHp', 'setMaxHp',
  'modifyMaxHp', 'setMaxHpBonus', 'setDeathSave', 'toggleCombatantCondition', 'clearCombatantConditions']);

export function useCharacterVitalDispatch(combat, reduce) {
  const current = useRef(combat);
  current.current = combat;
  const { notify } = useToast();
  return useCallback((action) => {
    const player = current.current?.combatants.find((c) => c.id === action.id && c.type === 'player' && c.sourceId);
    if (player && VITAL_ACTIONS.has(action.type)) {
      if (action.type === 'toggleCombatantCondition' && action.key === 'exhaustion') return;
      commandCharacterVitals(player.sourceId, { ...action, toggle: action.type === 'setDeathSave' })
        .catch((error) => notify('error', `Health update failed: ${error.message}`));
      return;
    }
    reduce(action);
  }, [notify, reduce]);
}
