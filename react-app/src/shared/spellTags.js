function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function truthy(value) {
  return value === true || value === 'true' || value === 1;
}

export function isConcentrationSpell(spell) {
  if (!spell || typeof spell !== 'object') return false;

  if (truthy(spell.concentration)) return true;
  if (truthy(spell._adapterData?.concentration)) return true;

  return asArray(spell.duration).some((duration) => (
    truthy(duration?.concentration)
    || truthy(duration?.duration?.concentration)
  ));
}

export function isRitualSpell(spell) {
  if (!spell || typeof spell !== 'object') return false;

  return Boolean(
    truthy(spell.ritual)
    || truthy(spell.meta?.ritual)
    || truthy(spell._adapterData?.ritual)
  );
}
