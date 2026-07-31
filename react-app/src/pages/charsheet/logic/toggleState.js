// Single source of truth for activatable sheet actions (Bladesong, Rage, …).
//
// Convention: a sheet action becomes a toggle by declaring `_toggleKey`. Its
// on/off state lives on the character as `<toggleKey>Active`
// (e.g. _toggleKey "bladesong" → C.bladesongActive, "rage" → C.rageActive).
// Adapters register effects gated on that flag via `condition: C => C.<x>Active`.
//
// Both the toggle UI (ActionsTab) and the Long Rest reset (CharacterSheet) read
// the convention from here, so adding a toggle never touches either of them.

import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { selectedFeatNames } from './sheetEffects.js';

export function toggleActiveField(toggleKey) {
  return `${toggleKey}Active`;
}

// Active-state field names of every toggleable action available to C, walking
// the same sources the action list is built from (class / subclass / species /
// feat). The registry is authoritative — never hardcode flag names elsewhere.
export function collectToggleActiveFields(C) {
  const fields = new Set();
  const scan = (list) => (list || []).forEach((action) => {
    if (action?._toggleKey) fields.add(toggleActiveField(action._toggleKey));
  });

  const classes = [
    { name: C?.className, sub: C?.subclassShortName },
    ...((C?.extraClasses || []).map((e) => ({ name: e?.name, sub: e?.subclassShortName }))),
  ].filter((c) => c.name);

  classes.forEach(({ name, sub }) => {
    scan(installedRegistry.getClassSheetActions(name));
    if (sub) scan(installedRegistry.getSubclassSheetActions(name, sub));
  });
  if (C?.speciesName) scan(installedRegistry.getSpeciesSheetActions(C.speciesName, C.speciesSource));
  selectedFeatNames(C).forEach((feat) => scan(installedRegistry.getFeatSheetActions(feat)));

  return [...fields];
}

// Patch that turns OFF every active toggle — applied on Long Rest.
export function clearedToggles(C) {
  const patch = {};
  collectToggleActiveFields(C).forEach((field) => {
    if (C?.[field]) patch[field] = false;
  });
  return patch;
}
