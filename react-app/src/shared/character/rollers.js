const ROLLER_KINDS = new Set(['damage', 'heal', 'utility', 'tempHp']);

function asText(value) {
  if (value == null || value === false) return '';
  return String(value).trim();
}

function resolveValue(value, context) {
  return typeof value === 'function' ? value(context) : value;
}

export function normalizeRollerKind(kind) {
  const compact = String(kind || 'damage').replace(/[^a-z]/gi, '').toLowerCase();
  if (compact === 'heal' || compact === 'healing') return 'heal';
  if (compact === 'utility' || compact === 'roll') return 'utility';
  if (compact === 'temphp' || compact === 'temporaryhp') return 'tempHp';
  return 'damage';
}

export function normalizeRollers(rollers) {
  if (!Array.isArray(rollers)) return [];

  return rollers.flatMap((roller, index) => {
    if (!roller || typeof roller !== 'object' || Array.isArray(roller)) return [];
    const formulaType = typeof roller.formula;
    if (!['string', 'number', 'function'].includes(formulaType)) return [];

    const kind = normalizeRollerKind(roller.kind);
    return [{
      ...roller,
      key: roller.key || `${kind}-${index}`,
      kind: ROLLER_KINDS.has(kind) ? kind : 'damage',
    }];
  });
}

// Canonical action boundary. `rollers` is preferred; legacy fields remain
// readable so imported characters and old adapterRuntime snapshots still work.
export function getActionRollers(action) {
  if (!action || typeof action !== 'object') return [];
  if (Array.isArray(action.rollers)) {
    const normalized = normalizeRollers(action.rollers);
    if (normalized.length || action.rollers.length === 0) return normalized;
  }

  const rollers = [];
  const formula = action.rollFormula ?? action.damageFormula;
  if (formula != null && formula !== '') {
    rollers.push({
      kind: action.rollKind ?? action.damageKind ?? 'damage',
      formula,
      label: action.rollButtonLabel ?? action.damageButtonLabel,
    });
  }
  if (action.healFormula != null && action.healFormula !== '') {
    rollers.push({
      kind: 'heal',
      formula: action.healFormula,
      label: action.healButtonLabel,
    });
  }
  return normalizeRollers(rollers);
}

export function resolveRollers(rollers, context = {}) {
  return normalizeRollers(rollers).flatMap((roller, index) => {
    const formula = asText(resolveValue(roller.formula, { ...context, roller, index }));
    if (!formula) return [];

    const resolvedContext = { ...context, roller, index, formula };
    const label = asText(resolveValue(roller.label, resolvedContext));
    const title = asText(resolveValue(roller.title, resolvedContext));

    return [{
      ...roller,
      formula,
      label: label || undefined,
      title: title || undefined,
    }];
  });
}

export function resolveActionRollers(action, context = {}) {
  return resolveRollers(getActionRollers(action), context);
}
