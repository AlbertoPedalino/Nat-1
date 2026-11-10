// The spell picks a 5etools `additionalSpells` entry leaves to the player:
// its `{ choose: "level=0|class=Wizard" }` items, grouped per mode and level
// scope. Feats, species and lineages all read their spell choices from here.

const CHOICE_MODES = ['known', 'innate', 'prepared', 'expanded'];

export function parseChooseString(value) {
  const out = { level: null, levels: [], classes: [], schools: [] };
  String(value || '').split('|').forEach((part) => {
    const [k, v] = part.split('=');
    if (k === 'level') {
      out.levels = String(v || '').split(';').map(Number).filter(Number.isFinite);
      out.level = out.levels.length === 1 ? out.levels[0] : null;
    }
    if (k === 'class') out.classes = String(v || '').split(';').map((s) => s.trim()).filter(Boolean);
    if (k === 'school') out.schools = String(v || '').split(';').map((s) => s.trim()).filter(Boolean);
  });
  return out;
}

function collectChooseEntries(node) {
  const entries = [];
  if (Array.isArray(node)) {
    node.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      if (item.choose) entries.push(item);
      else entries.push(...collectChooseEntries(item));
    });
  } else if (node && typeof node === 'object') {
    Object.values(node).forEach((value) => entries.push(...collectChooseEntries(value)));
  }
  return entries;
}

// One group per mode, level scope and filter signature:
// { mode, minLevel, level, levels, classes, schools, count, signature }.
export function additionalSpellChoiceGroups(grant) {
  const out = [];
  if (!grant || typeof grant !== 'object') return out;
  CHOICE_MODES.forEach((mode) => {
    const section = grant[mode];
    if (!section || typeof section !== 'object') return;
    Object.entries(section).forEach(([scope, node]) => {
      const grouped = new Map();
      collectChooseEntries(node).forEach((entry) => {
        const parsed = parseChooseString(entry.choose);
        const signature = `${parsed.levels.join(',') || '?'}|${parsed.classes.join(',')}|${parsed.schools.join(',')}`;
        const current = grouped.get(signature) || { ...parsed, count: 0, signature };
        current.count += entry.count || 1;
        grouped.set(signature, current);
      });
      const minLevel = /^\d+$/.test(scope) ? Math.max(1, Number(scope)) : 1;
      grouped.forEach((group) => out.push({ mode, minLevel, ...group }));
    });
  });
  return out;
}

// The builder spec filter for one group.
export function choiceGroupSpellFilter(group) {
  return {
    spellLevels: group.levels.length ? group.levels : undefined,
    classes: group.classes,
    schools: group.schools.length ? group.schools : undefined,
  };
}

// "Cantrip", "Spell Lv.1", "Spell Lv.1/2".
export function choiceGroupWhat(group) {
  if (group.level === 0) return 'Cantrip';
  return group.level != null ? `Spell Lv.${group.level}` : `Spell Lv.${group.levels.join('/')}`;
}

export function choiceGroupLabel(group) {
  return `${choiceGroupWhat(group)}${group.classes.length ? ` (${group.classes.join('/')})` : ''}`;
}
