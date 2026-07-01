import { collectSheetEffects } from '../../pages/charsheet/logic/sheetEffects.js';
import { getAllResourceDefs } from '../../pages/charsheet/logic/restResources.js';
import { primaryClassLevel } from './classLevel.js';

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildResourceLabelMap(character) {
  const map = {};
  if (!character) return map;
  getAllResourceDefs(character).forEach((def) => {
    if (def?.key && def?.name) map[def.key] = def.name;
  });
  return map;
}

export function resolveInitiativeTriggeredResourceRecoveries(character, resources) {
  const applied = [];
  if (!character || !resources) return { resources, applied };
  const resourceLabelMap = buildResourceLabelMap(character);
  const effects = collectSheetEffects(character);
  let next = resources;
  let modified = false;

  effects.forEach((effect) => {
    if (norm(effect.type) !== 'initiativerecovery') return;
    if (primaryClassLevel(character) < Number(effect.minLevel || 1)) return;
    const resourceKey = effect.resourceKey;
    if (!resourceKey) return;
    if (!modified) next = { ...resources };
    const floor = Number(effect.floor || effect.recoverTo || 0);
    if (floor <= 0) return;
    const current = Number(next[resourceKey] || 0);
    const max = Number(effect.max || Infinity);
    if (current >= floor) return;
    const recovered = Math.min(max, floor) - current;
    if (recovered <= 0) return;
    next[resourceKey] = Math.min(max, current + recovered);
    modified = true;
    applied.push({
      label: effect.label || effect.note || 'Initiative Recovery',
      resourceKey,
      resourceLabel: effect.resourceLabel || resourceLabelMap[resourceKey] || resourceKey,
      from: current,
      to: next[resourceKey],
    });
  });

  return { resources: modified ? next : resources, applied };
}

export function applyInitiativeTriggeredResourceRecoveries(character, resources, setResources) {
  if (!character || !resources || typeof setResources !== 'function') return { resources, applied: [] };
  const result = resolveInitiativeTriggeredResourceRecoveries(character, resources);
  if (result.resources !== resources) {
    setResources(result.resources);
  }
  return result;
}

export function collectInitiativeRecoveryEffects(character) {
  if (!character) return [];
  return collectSheetEffects(character).filter((effect) => {
    if (norm(effect.type) !== 'initiativerecovery') return false;
    if (primaryClassLevel(character) < Number(effect.minLevel || 1)) return false;
    return true;
  });
}
