export function encounterRollActor({ selectedStatblock, combat }) {
  const selected = selectedStatblock;
  const combatant = selected?.combatantId != null
    ? combat?.combatants?.find((entry) => entry.id === selected.combatantId)
    : !selected?.monster ? combat?.combatants?.[combat.currentTurn || 0] : null;
  if (!combatant) return { actorName: selected?.monster?.name || 'GM' };
  return {
    actorName: combatant.name,
    actorColor: combatant.shapeClr || combatant.iconColor || combatant.color || null,
    actorShape: combatant.shape || null,
    actorLabel: combatant.label || '',
    characterId: combatant.type === 'player' ? combatant.sourceId || null : null,
  };
}
