import { useCallback, useRef } from 'react';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import {
  FIGHT_UNAVAILABLE,
  commitFightCombatantVitals,
  getInstanceFight,
} from '../../../shared/cloud/api/encounterFights.js';
import {
  isMonsterCombatant,
  monsterVitalsBase,
  monsterVitalsPatch,
} from '../../../shared/vtt/tokens/fightVitals.js';
import { snapshotFight } from '../combat/combat.js';
import { encounterReducer } from '../state/reducer.js';

// Everything that changes an enemy's vitals or marks.
export const MONSTER_VITAL_ACTIONS = new Set([
  'modifyHp', 'setHp', 'setMaxHp', 'setTempHp', 'modifyTempHp', 'modifyMaxHp', 'setMaxHpBonus',
  'toggleCombatantCondition', 'clearCombatantConditions',
  'toggleCombatantEffect', 'addCombatantEffect', 'setCombatantEffectDuration',
  'removeCombatantEffect', 'clearCombatantEffects',
]);

// Enemy vitals of a cloud fight are written in one place: the combatant in its
// `encounter_fights` row, through one RPC per edit. The screen updates at once;
// the row's answer (or, after a failure, one read of the row) realigns it.
// Commands of one fight are sent in order and never retried.
//
// `cloudRef.current` is what useCloudFights returns for this instance.
export function useMonsterVitalDispatch({ state, reduce, cloudRef }) {
  const { notify } = useToast();
  const stateRef = useRef(state);
  stateRef.current = state;
  const queuesRef = useRef(new Map());

  const isBusy = useCallback((fightId) => (
    (queuesRef.current.get(String(fightId))?.pending || 0) > 0
  ), []);

  const dispatch = useCallback((action) => {
    const current = stateRef.current;
    const combat = current?.combat;
    const cloud = cloudRef.current;
    const target = combat?.combatants?.find((combatant) => combatant.id === action?.id);
    if (!cloud?.canSync || !combat?.fightId || !MONSTER_VITAL_ACTIONS.has(action?.type) || !isMonsterCombatant(target)) {
      reduce(action);
      return;
    }

    const next = encounterReducer(current, action);
    const find = (fight) => fight?.combatants?.find((combatant) => combatant.id === action.id);
    const before = find(snapshotFight(combat));
    const after = next.combat ? find(snapshotFight(next.combat)) : null;
    const patch = monsterVitalsPatch(before, after);
    // An edit that changes nothing writes nothing.
    if (!Object.keys(patch).length) return;

    const fightId = String(combat.fightId);
    // The fight save has nothing to add for this edit: its command carries it.
    cloud.markSettled(next.fights?.find((fight) => String(fight.id) === fightId));
    // A second click before React re-renders computes from this one.
    stateRef.current = next;
    reduce(action);

    const queue = queuesRef.current.get(fightId) || { chain: Promise.resolve(), pending: 0 };
    queuesRef.current.set(fightId, queue);
    queue.pending += 1;
    queue.chain = queue.chain
      .then(() => commitFightCombatantVitals(fightId, action.id, { base: monsterVitalsBase(before), patch }))
      .then(({ applied, row }) => {
        if (!applied) notify('warning', 'This creature changed elsewhere. Showing the latest values; try again if needed.');
        return { row };
      }, async (error) => {
        if (error?.code === FIGHT_UNAVAILABLE) return { unavailable: true };
        notify('error', `Enemy health update failed: ${error?.message || 'unknown error'}`);
        return { row: await getInstanceFight(fightId).catch(() => null) };
      })
      .then(({ row, unavailable }) => {
        queue.pending -= 1;
        // No cloud row yet (or no migration): the local edit stands and the
        // ordinary fight save stores it.
        if (unavailable) cloudRef.current?.requestSave(fightId);
        // Only the last answer realigns, so a burst of clicks does not flicker
        // back through intermediate values.
        if (queue.pending === 0) {
          queuesRef.current.delete(fightId);
          if (row) cloudRef.current?.acceptRemoteFight(row);
        }
      });
  }, [cloudRef, notify, reduce]);

  return { dispatch, isBusy };
}
