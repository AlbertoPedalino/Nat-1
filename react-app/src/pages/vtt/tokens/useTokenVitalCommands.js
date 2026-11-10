import { useCallback, useRef, useState } from 'react';
import { commitFightCombatantVitals, getInstanceFight } from '../../../shared/cloud/api/encounterFights.js';
import { setTokenHp } from '../../../shared/cloud/api/vttTokens.js';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import {
  creatureVitalsOfToken,
  linkedCombatant,
  monsterVitalsBase,
  monsterVitalsPatch,
  newerFightRow,
  tokenVitalsOfCreature,
} from '../../../shared/vtt/tokens/fightVitals.js';
import { applyCombatantEdit, applyCombatantHpCommand } from '../../../shared/encounter/combatantVitals.js';
import { patchById } from '../../../shared/vtt/session/liveScene.js';
import { createKeyedQueue } from '../../../shared/cloud/sync/keyed.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';

// The hit points of any piece, from its menu: damage, healing, temporary and
// maximum hit points as one intent (a character health command's name)
// whatever the piece is. A character's goes to their sheet as it is; a piece
// linked to a fight steps its combatant with the builder's rules (the fight is
// read first if this screen has not loaded it yet); any other — its fight
// gone, or never one — keeps its hit points, temporary ones and the maximum's
// bonus included, in its GM-only values.
//
// `commitCreatureEdit` is the same road for what the GM types in a creature's
// menu (hit points, conditions, reminders).
export function useTokenVitalCommands({
  gmVitals, characterHealth, writeConditions, setTokens, notify, refreshVisibleTokens,
}) {
  // Steps on a creature are queued, each starting from the fight as the last
  // one left it: the answer to our own step comes back with the RPC, before
  // its realtime event.
  const fightsRef = useRef(gmVitals.fights);
  fightsRef.current = gmVitals.fights;
  const answeredFightsRef = useRef({});
  // Commands run one at a time, in call order.
  const [queue] = useState(createKeyedQueue);

  // The combatant as the newest copy of its fight has it, reading the fight
  // when this screen does not hold it yet. Null: no such creature online.
  const currentCombatant = useCallback(async (ref) => {
    const fightId = String(ref.fightId);
    const held = newerFightRow(answeredFightsRef.current[fightId], fightsRef.current[fightId]);
    const found = linkedCombatant({ [fightId]: held }, ref);
    if (found || held) return found;
    const row = await getInstanceFight(ref.fightId);
    const fetched = linkedCombatant({ [fightId]: row }, ref);
    if (fetched) {
      answeredFightsRef.current[fightId] = row;
      gmVitals.acceptFight(row);
    }
    return fetched;
  }, [gmVitals]);

  // One change (`change(before) -> after`) to a fight's creature, queued, each
  // starting from the fight as the last one left it: the answer to our own
  // step comes back with the RPC, before its realtime event. Resolves false
  // when the piece has no creature online to change.
  const commitCreature = useCallback((ref, change) => {
    const run = async () => {
      let before;
      try {
        before = await currentCombatant(ref);
      } catch (cause) {
        notify('error', failureMessage('Could not update that creature.', cause));
        return true;
      }
      if (!before) return false;
      try {
        // Sent once, like every health command: a conflict is never replayed,
        // damage and healing included. The map realigns on the answer and the
        // GM repeats the step if it still applies.
        const patch = monsterVitalsPatch(before, change(before));
        if (!Object.keys(patch).length) return true;
        const { applied, row } = await commitFightCombatantVitals(ref.fightId, ref.combatantId, {
          base: monsterVitalsBase(before),
          patch,
        });
        if (row) {
          answeredFightsRef.current[String(ref.fightId)] = row;
          gmVitals.acceptFight(row);
        }
        if (applied) return true;
        notify('warning', 'This creature changed elsewhere. Showing the latest values; try again if needed.');
      } catch (cause) {
        notify('error', failureMessage('Could not update that creature.', cause));
      }
      refreshVisibleTokens();
      return true;
    };
    return queue.run('vitals', run);
  }, [currentCombatant, gmVitals, notify, refreshVisibleTokens]);

  // A loose piece starts from what the menu showed (`shown`) when it has it:
  // a value typed a moment ago may not be on the piece yet.
  const commitLoose = useCallback(async (token, command, shown) => {
    const before = shown || creatureVitalsOfToken(token);
    const after = applyCombatantHpCommand(before, command);
    const vitals = {
      ...tokenVitalsOfCreature(after),
      // Such a piece has no base maximum but the one last typed: typing one
      // is a new base, stepping it shows how far it moved.
      ...(command.type === 'setMaxHp' ? { maxHpBonus: 0 } : {}),
    };
    gmVitals.setLocal(token.id, vitals);
    try {
      await setTokenHp(token.id, vitals);
      if (after.activeConditions && after.activeConditions !== before.activeConditions) {
        setTokens((current) => patchById(current, token.id, { conditions: after.activeConditions }));
        await writeConditions(token, after.activeConditions);
      }
    } catch (cause) {
      gmVitals.reload();
      notify('error', failureMessage('Could not update those hit points.', cause));
    }
  }, [gmVitals, notify, setTokens, writeConditions]);

  const handleTokenVitals = useCallback(async (token, command, shown = null) => {
    if (token.characterId) {
      try {
        await characterHealth(token.characterId, command);
      } catch (cause) {
        notify('error', failureMessage('Could not update those hit points.', cause));
      }
      return;
    }
    const ref = parseSourceRef(token.sourceRef);
    if (ref && await commitCreature(ref, (before) => applyCombatantHpCommand(before, command))) return;
    await commitLoose(token, command, shown);
  }, [characterHealth, commitCreature, commitLoose, notify]);

  // True when the piece is a fight's creature and the edit went to it.
  const commitCreatureEdit = useCallback(async (token, edit) => {
    const ref = token.characterId ? null : parseSourceRef(token.sourceRef);
    if (!ref) return false;
    return commitCreature(ref, (before) => applyCombatantEdit(before, edit));
  }, [commitCreature]);

  return { handleTokenVitals, commitCreatureEdit };
}
