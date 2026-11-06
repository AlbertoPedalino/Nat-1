import { collectSheetEffects } from '../../../pages/charsheet/state/sheetEffects.js';
import { getAllResourceDefs } from '../../../pages/charsheet/resources/restResources.js';
import { primaryClassLevel } from '../progression/classLevel.js';
import { matchKey } from '../../content/nameKeys.js';

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
    if (matchKey(effect.type) !== 'initiativerecovery') return;
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

