import { makeSourceRef } from '../vtt/tokens/encounterSync.js';

// Who a roll comes from, for a combatant of a fight: the same name, colour,
// shape and reference in the builder's log and on the battle map.
export function combatantRollActor(combatant, { instanceId, fightId } = {}) {
  return {
    actorName: combatant.name,
    actorColor: combatant.shapeClr || combatant.iconColor || combatant.color || null,
    actorShape: combatant.shape || null,
    actorLabel: combatant.label || '',
    characterId: combatant.type === 'player' ? combatant.sourceId || null : null,
    sourceRef: makeSourceRef(instanceId, fightId, combatant.id),
  };
}
