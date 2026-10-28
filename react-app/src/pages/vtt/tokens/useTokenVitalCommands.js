import { useCallback, useRef } from 'react';
import { commitFightCombatantVitals } from '../../../shared/cloud/api/encounterFights.js';
import { setTokenHp } from '../../../shared/cloud/api/vtt.js';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import {
  applyMonsterVitalCommand,
  linkedCombatant,
  monsterVitalsBase,
  monsterVitalsPatch,
  newerFightRow,
  RELATIVE_VITAL_COMMANDS,
} from '../../../shared/vtt/tokens/fightVitals.js';

// The hit points of any piece, from its menu: damage, healing, temporary and
// maximum hit points as one intent (a character health command's name)
// whatever the piece is. A character's goes to their sheet as it is; a piece
// whose fight is loaded steps its combatant with the builder's rules; any
// other keeps its hit points, temporary ones and the maximum's bonus included,
// in its GM-only values.
export function useTokenVitalCommands({
  gmVitals, characterHealth, writeConditions, setTokens, notify, refreshVisibleTokens,
}) {
  // Steps on a creature are queued, each starting from the fight as the last
  // one left it: the answer to our own step comes back with the RPC, before
  // its realtime event.
  const fightsRef = useRef(gmVitals.fights);
  fightsRef.current = gmVitals.fights;
  const answeredFightsRef = useRef({});
  const queueRef = useRef(Promise.resolve());

  const commitCreature = useCallback((ref, command) => {
    const fightId = String(ref.fightId);
    const run = async () => {
      const latestRow = newerFightRow(answeredFightsRef.current[fightId], fightsRef.current[fightId]);
      let before = linkedCombatant({ [fightId]: latestRow }, ref);
      if (!before) return;
      try {
        // Damage and healing are amounts: on a conflict they apply once more
        // to the values the database answered with. A value set outright is
        // not replayed over somebody else's.
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const patch = monsterVitalsPatch(before, applyMonsterVitalCommand(before, command));
          if (!Object.keys(patch).length) return;
          const { applied, row } = await commitFightCombatantVitals(ref.fightId, ref.combatantId, {
            base: monsterVitalsBase(before),
            patch,
          });
          if (row) {
            answeredFightsRef.current[fightId] = row;
            gmVitals.acceptFight(row);
          }
          if (applied) return;
          const latest = row && linkedCombatant({ [fightId]: row }, ref);
          if (!latest || !RELATIVE_VITAL_COMMANDS.has(command.type)) break;
          before = latest;
        }
        notify('warning', 'This creature changed elsewhere. Showing the latest values; try again if needed.');
      } catch (cause) {
        notify('error', cause?.message || 'Could not update that creature.');
      }
      refreshVisibleTokens();
    };
    queueRef.current = queueRef.current.then(run, run);
    return queueRef.current;
  }, [gmVitals, notify, refreshVisibleTokens]);

  // A loose piece starts from what the menu showed (`shown`) when it has it:
  // a value typed a moment ago may not be on the piece yet.
  const commitLoose = useCallback(async (token, command, shown) => {
    const before = shown || {
      hpCurrent: token.hpCurrent ?? null,
      hpMax: token.hpMax ?? null,
      tempHP: token.tempHp ?? 0,
      maxHPBonus: token.maxHpBonus ?? 0,
      activeConditions: token.conditions || [],
    };
    const after = applyMonsterVitalCommand(before, command);
    const vitals = {
      hpCurrent: after.hpCurrent ?? null,
      hpMax: after.hpMax ?? null,
      tempHp: after.tempHP ?? 0,
      // Such a piece has no base maximum but the one last typed: typing one
      // is a new base, stepping it shows how far it moved.
      maxHpBonus: command.type === 'setMaxHp' ? 0 : (after.maxHPBonus ?? 0),
    };
    gmVitals.setLocal(token.id, vitals);
    try {
      await setTokenHp(token.id, vitals);
      if (after.activeConditions && after.activeConditions !== before.activeConditions) {
        setTokens((current) => current.map((item) => (
          item.id === token.id ? { ...item, conditions: after.activeConditions } : item
        )));
        await writeConditions(token, after.activeConditions);
      }
    } catch (cause) {
      gmVitals.reload();
      notify('error', cause?.message || 'Could not update those hit points.');
    }
  }, [gmVitals, notify, setTokens, writeConditions]);

  return useCallback(async (token, command, shown = null) => {
    if (token.characterId) {
      try {
        await characterHealth(token.characterId, command);
      } catch (cause) {
        notify('error', cause?.message || 'Could not update those hit points.');
      }
      return;
    }
    const ref = parseSourceRef(token.sourceRef);
    if (ref && linkedCombatant(gmVitals.fights, ref)) {
      await commitCreature(ref, command);
      return;
    }
    await commitLoose(token, command, shown);
  }, [characterHealth, commitCreature, commitLoose, gmVitals.fights, notify]);
}
