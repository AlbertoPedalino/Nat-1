function cloneJson(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneJson(child)]));
}

function recordKey(name, source) {
  return `${String(name || '').trim().toLowerCase()}|${String(source || '').trim().toLowerCase()}`;
}

function getParentAndKey(target, path, create = false) {
  const parts = String(path || '').split('.').filter(Boolean);
  if (!parts.length) return null;
  let parent = target;
  for (const part of parts.slice(0, -1)) {
    if (!parent[part] || typeof parent[part] !== 'object' || Array.isArray(parent[part])) {
      if (!create) return null;
      parent[part] = {};
    }
    parent = parent[part];
  }
  return { parent, key: parts.at(-1) };
}

function arrayItems(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.map(cloneJson) : [cloneJson(value)];
}

function sameJsonValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyCopyModification(target, path, rawModification) {
  const modification = rawModification === 'remove'
    ? { mode: 'remove' }
    : rawModification;
  if (!modification || typeof modification !== 'object') return;

  const location = getParentAndKey(target, path, modification.mode !== 'remove');
  if (!location) return;
  const { parent, key } = location;

  if (modification.mode === 'remove') {
    delete parent[key];
    return;
  }
  if (modification.mode === 'setProp') {
    parent[key] = cloneJson(modification.value);
    return;
  }

  const current = Array.isArray(parent[key]) ? parent[key].map(cloneJson) : [];
  const items = arrayItems(modification.items);
  if (modification.mode === 'appendArr') {
    parent[key] = [...current, ...items];
  } else if (modification.mode === 'appendIfNotExistsArr') {
    parent[key] = [...current, ...items.filter((item) => !current.some((entry) => sameJsonValue(entry, item)))];
  } else if (modification.mode === 'insertArr') {
    const requestedIndex = Number(modification.index);
    const index = Number.isFinite(requestedIndex) && requestedIndex >= 0
      ? Math.min(requestedIndex, current.length)
      : current.length;
    parent[key] = [...current.slice(0, index), ...items, ...current.slice(index)];
  } else if (modification.mode === 'replaceArr') {
    const requestedIndex = Number(modification.replace?.index ?? modification.index);
    if (!Number.isFinite(requestedIndex) || requestedIndex < 0 || requestedIndex >= current.length) return;
    parent[key] = [
      ...current.slice(0, requestedIndex),
      ...items,
      ...current.slice(requestedIndex + 1),
    ];
  }
}

/** Resolve 5etools `_copy` chains while keeping the upstream data external. */
export function resolveCopyRecords(records) {
  const source = Array.isArray(records) ? records : [];
  const lookup = new Map(source.map((record) => [recordKey(record?.name, record?.source), record]));
  const resolved = new Map();
  const resolving = new Set();

  function resolve(record) {
    if (!record || typeof record !== 'object') return record;
    const key = recordKey(record.name, record.source);
    if (resolved.has(key)) return cloneJson(resolved.get(key));
    if (resolving.has(key)) return cloneJson(record);
    resolving.add(key);

    let result = {};
    const copy = record._copy;
    if (copy?.name) {
      const base = lookup.get(recordKey(copy.name, copy.source || record.source));
      if (base) result = resolve(base);
      Object.entries(copy._mod || {}).forEach(([path, modification]) => {
        applyCopyModification(result, path, modification);
      });
    }

    Object.entries(record).forEach(([field, value]) => {
      if (field !== '_copy') result[field] = cloneJson(value);
    });
    resolving.delete(key);
    resolved.set(key, result);
    return cloneJson(result);
  }

  return source.map(resolve);
}

function normalizeComparable(value) {
  return String(value || '').split('|')[0].trim().toLowerCase();
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isWeaponType(type) {
  return ['M', 'R', 'WEAPON'].includes(type);
}

function isArmorType(type) {
  return ['LA', 'MA', 'HA', 'S', 'ARMOR'].includes(type);
}

function matchesProperty(item, required) {
  const properties = (Array.isArray(item?.property) ? item.property : [])
    .map(normalizeComparable);
  const requiredProperties = (Array.isArray(required) ? required : [required])
    .map(normalizeComparable)
    .filter(Boolean);
  return requiredProperties.every((property) => properties.includes(property));
}

export function matchesItemRequirement(item, requirement) {
  if (!item || !requirement || typeof requirement !== 'object') return false;
  const type = String(item.type || '').split('|')[0].toUpperCase();

  if (requirement.name && normalizeName(item.name) !== normalizeName(requirement.name)) return false;
  if (requirement.source && String(item.source || '').toUpperCase() !== String(requirement.source).toUpperCase()) return false;
  if (requirement.type) {
    const requiredType = String(requirement.type).split('|')[0].toUpperCase();
    if (requiredType === 'WEAPON' && !isWeaponType(type)) return false;
    if (requiredType === 'ARMOR' && !isArmorType(type)) return false;
    if (!['WEAPON', 'ARMOR'].includes(requiredType) && requiredType !== type) return false;
  }
  if (requirement.weapon && !isWeaponType(type)) return false;
  if (requirement.weaponCategory && normalizeComparable(requirement.weaponCategory) !== normalizeComparable(item.weaponCategory)) return false;
  if (requirement.armor && !isArmorType(type)) return false;
  if (requirement.property && !matchesProperty(item, requirement.property)) return false;

  const known = new Set(['name', 'source', 'type', 'weapon', 'weaponCategory', 'armor', 'property']);
  return Object.keys(requirement).some((field) => known.has(field));
}

export function matchesItemRequirements(item, requirements) {
  const list = Array.isArray(requirements) ? requirements : [];
  return list.length === 0 || list.some((requirement) => matchesItemRequirement(item, requirement));
}

export function isExcludedByVariant(item, excludes) {
  const list = Array.isArray(excludes) ? excludes : [];
  return list.some((requirement) => matchesItemRequirement(item, requirement));
}
