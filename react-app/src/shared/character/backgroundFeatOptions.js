function titleCaseWords(value) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategoryList(value) {
  const raw = Array.isArray(value) ? value : (value == null ? [] : [value]);
  return [...new Set(raw.map((entry) => String(entry || '').trim()).filter(Boolean))];
}

function parseFeatReference(reference) {
  const raw = String(reference || '').trim();
  if (!raw) return null;
  const alternatives = raw.split(';').map((entry) => entry.trim()).filter(Boolean);
  const featParts = alternatives[0].split('|').map((entry) => entry.trim());
  const classParts = alternatives[1]?.split('|').map((entry) => entry.trim()) || [];
  const classHint = classParts[0] || featParts[2] || null;
  return {
    name: titleCaseWords(featParts[0]),
    classHint: classHint ? classHint.toLowerCase().replace(/[^a-z]/g, '') : null,
  };
}

function collectEntryOptions(entry, fixed, categories) {
  if (!entry) return;
  if (typeof entry === 'string') {
    const parsed = parseFeatReference(entry);
    if (parsed?.name) fixed.push(parsed);
    return;
  }
  if (typeof entry !== 'object' || Array.isArray(entry)) return;

  Object.entries(entry).forEach(([key, value]) => {
    if (!value) return;
    if (key === 'choose') {
      normalizeCategoryList(value?.category || value?.categories)
        .forEach((category) => categories.push(category));
      normalizeCategoryList(value?.from).forEach((option) => {
        if (/^[A-Z]{1,4}(?::[A-Z]+)?$/.test(option)) categories.push(option);
        else {
          const parsed = parseFeatReference(option);
          if (parsed?.name) fixed.push(parsed);
        }
      });
      return;
    }
    if (key === 'anyFromCategory') {
      normalizeCategoryList(value?.category || value?.categories || value)
        .forEach((category) => categories.push(category));
      return;
    }
    const parsed = parseFeatReference(key);
    if (parsed?.name) fixed.push(parsed);
  });
}

export function backgroundFeatOptions(background) {
  if (!background) return { fixed: [], categories: [] };
  if (background.feat) {
    const parsed = parseFeatReference(background.feat);
    return { fixed: parsed ? [parsed] : [], categories: [] };
  }

  const fixed = [];
  const categories = [];
  const entries = Array.isArray(background.feats)
    ? background.feats
    : (background.feats ? [background.feats] : []);
  entries.forEach((entry) => collectEntryOptions(entry, fixed, categories));

  const seen = new Set();
  return {
    fixed: fixed.filter((entry) => {
      const key = `${entry.name.toLowerCase()}|${entry.classHint || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    categories: [...new Set(categories)],
  };
}

export function backgroundOriginFeat(background) {
  const options = backgroundFeatOptions(background);
  if (!options.fixed.length && !options.categories.length) return null;
  if (options.fixed.length === 1 && !options.categories.length) {
    return {
      fixed: options.fixed[0].name,
      classHint: options.fixed[0].classHint,
      fixedOptions: [options.fixed[0].name],
      categories: [],
    };
  }
  return {
    fixed: null,
    classHint: null,
    fixedOptions: options.fixed.map((entry) => entry.name),
    categories: options.categories,
  };
}

export function backgroundGuaranteedFeatNames(background) {
  const origin = backgroundOriginFeat(background);
  return origin?.fixed ? [origin.fixed] : [];
}

export function backgroundFeatOptionLabel(background) {
  const origin = backgroundOriginFeat(background);
  if (!origin) return '';
  if (origin.fixed) return origin.fixed;
  const parts = [...(origin.fixedOptions || [])];
  const labels = {
    DG: 'Dark Gift',
    O: 'Origin Feat',
    G: 'General Feat',
    EB: 'Epic Boon',
  };
  if (origin.categories?.length) {
    parts.push(origin.categories.map((category) => labels[category] || category).join('/'));
  }
  return parts.join(' or ');
}
