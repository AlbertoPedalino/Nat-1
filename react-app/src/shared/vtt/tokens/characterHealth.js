import { effectId, normalizeEffects } from '../../character/combat/combatEffects.js';

// Convert a token edit into only the user's changes. Display-only edits carry
// no health command and cannot overwrite a concurrent damage/healing command.
export function tokenHealthCommand(token, patch) {
  const command = { type: 'editToken', patch: {} };
  if (Object.hasOwn(patch, 'currentHP')) command.patch.currentHP = patch.currentHP;
  if (patch.activeConditions) {
    const before = token.conditions || [];
    command.addConditions = patch.activeConditions.filter((key) => !before.includes(key));
    command.removeConditions = before.filter((key) => !patch.activeConditions.includes(key));
  }
  if (patch.activeEffects) {
    const before = normalizeEffects(token.effects);
    const after = normalizeEffects(patch.activeEffects);
    const beforeIds = new Set(before.map(effectId));
    const afterIds = new Set(after.map(effectId));
    command.addEffects = after.filter((effect) => !beforeIds.has(effectId(effect)));
    command.removeEffects = [...beforeIds].filter((id) => !afterIds.has(id));
  }
  if (patch.deathSaves) command.deathSaves = Object.fromEntries(
    Object.entries(patch.deathSaves).filter(([key, value]) => value !== token.deathSaves?.[key]),
  );
  return command;
}
