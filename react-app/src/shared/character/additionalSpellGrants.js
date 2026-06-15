const MODES = ['known', 'innate', 'prepared'];

function spellNameFromRef(value) {
  return String(value || '').split('|')[0].split('#')[0].trim();
}

function normalizeAbility(value, chosenAbility = null) {
  if (value === 'inherit') return chosenAbility;
  if (typeof value === 'string') return value;
  const choices = value?.choose;
  if (Array.isArray(choices)) return chosenAbility || (choices.length === 1 ? choices[0] : null);
  if (Array.isArray(choices?.from)) return chosenAbility || (choices.from.length === 1 ? choices.from[0] : null);
  return chosenAbility;
}

function parseUsesKey(value) {
  const match = String(value || '').match(/^(\d+)/);
  return match ? Math.max(1, Number(match[1])) : 1;
}

function walkFixedSpells(node, context, out) {
  if (!node) return;
  if (typeof node === 'string') {
    const name = spellNameFromRef(node);
    if (name) {
      const { defaultCanAlsoUseSlots, ...grantContext } = context;
      out.push({ name, ...grantContext });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((entry) => walkFixedSpells(entry, context, out));
    return;
  }
  if (typeof node !== 'object' || node.choose) return;

  Object.entries(node).forEach(([key, value]) => {
    if (key === 'daily' || key === 'rest') {
      Object.entries(value || {}).forEach(([usesKey, spells]) => {
        walkFixedSpells(spells, {
          ...context,
          freeCast: {
            maxUses: parseUsesKey(usesKey),
            recharge: key === 'rest' ? 'shortOrLongRest' : 'longRest',
            canAlsoUseSlots: context.defaultCanAlsoUseSlots ?? context.mode === 'prepared',
          },
        }, out);
      });
      return;
    }
    if (key === 'will') {
      walkFixedSpells(value, { ...context, atWill: true }, out);
      return;
    }
    if (key === 'ritual') {
      walkFixedSpells(value, { ...context, ritualOnly: true }, out);
      return;
    }
    walkFixedSpells(value, context, out);
  });
}

function resolveGrantEntry(additionalSpells, entryIndex) {
  const entries = Array.isArray(additionalSpells) ? additionalSpells : [];
  if (!entries.length) return null;
  if (entries.length === 1) return entries[0];
  const index = Number(entryIndex);
  if (!Number.isInteger(index) || index < 0 || index >= entries.length) return null;
  return entries[index];
}

function overrideForSpell(overrides, spellName) {
  const wanted = String(spellName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return Object.entries(overrides || {}).find(([name]) => (
    String(name).toLowerCase().replace(/[^a-z0-9]/g, '') === wanted
  ))?.[1] || null;
}

export function enumerateFixedAdditionalSpells(additionalSpells, options = {}) {
  const grant = resolveGrantEntry(additionalSpells, options.entryIndex);
  if (!grant) return [];
  const ability = normalizeAbility(grant.ability, options.chosenAbility);
  const out = [];

  MODES.forEach((mode) => {
    const section = grant[mode];
    if (!section || typeof section !== 'object') return;
    Object.entries(section).forEach(([scope, node]) => {
      const minLevel = /^\d+$/.test(scope) ? Math.max(1, Number(scope)) : 1;
      walkFixedSpells(node, {
        mode,
        minLevel,
        ability,
        defaultCanAlsoUseSlots: options.defaultCanAlsoUseSlots,
      }, out);
    });
  });

  return out.map((entry) => {
    const override = overrideForSpell(options.spellOverrides, entry.name) || {};
    const freeCast = entry.freeCast
      ? { ...entry.freeCast, ...(override.freeCast || {}) }
      : (override.freeCast || null);
    return {
      ...entry,
      freeCast,
      spellOverrides: override.spell || null,
      modifiers: Array.isArray(override.modifiers) ? override.modifiers : [],
    };
  });
}
