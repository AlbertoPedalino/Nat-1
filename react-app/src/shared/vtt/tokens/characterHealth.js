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
  if (patch.deathSaves) command.deathSaves = Object.fromEntries(
    Object.entries(patch.deathSaves).filter(([key, value]) => value !== token.deathSaves?.[key]),
  );
  return command;
}
