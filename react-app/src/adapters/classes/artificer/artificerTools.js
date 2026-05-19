const CHOICE_KEYS = [
  'choose',
  'any',
  'anyTool',
  'anyArtisansTool',
  'anyMusicalInstrument',
  'anyGamingSet',
  'anyStandard',
  'anyExotic',
];

export function normalizeArtificerTool(value) {
  if (!value) return '';

  const raw = String(value)
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]*)?\}/gi, '$1')
    .replace(/\{@[a-z]+\s*/gi, '')
    .replace(/[{}]/g, '')
    .split('|')[0]
    .trim();

  const alias = {
    "thieves' tool": "Thieves' Tools",
    "thieves' tools": "Thieves' Tools",
    "tinker's tool": "Tinker's Tools",
    "tinker's tools": "Tinker's Tools",
    "smith's tool": "Smith's Tools",
    "smith's tools": "Smith's Tools",
    "woodcarver's tool": "Woodcarver's Tools",
    "woodcarver's tools": "Woodcarver's Tools",
    "calligrapher's supplies": "Calligrapher's Supplies",
    "cartographer's tools": "Cartographer's Tools",
    "alchemist's supplies": "Alchemist's Supplies",
    'herbalism kit': 'Herbalism Kit',
  };

  return alias[raw.toLowerCase()] || raw;
}

export function artificerToolKey(value) {
  return normalizeArtificerTool(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function asArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function addTool(out, value) {
  const key = artificerToolKey(value);
  if (key) out.add(key);
}

function addFixedToolBlocks(out, blocks) {
  asArray(blocks).forEach((block) => {
    if (!block) return;

    if (typeof block === 'string') {
      block.split(/[;,]/).forEach((value) => addTool(out, value));
      return;
    }

    if (typeof block !== 'object' || Array.isArray(block)) return;

    Object.keys(block)
      .filter((key) => !CHOICE_KEYS.includes(key) && block[key] !== false)
      .forEach((key) => addTool(out, key));
  });
}

function choiceLooksLikeTool(key) {
  const raw = String(key || '').toLowerCase();
  return raw.includes('tool') || raw.includes('instrument') || raw.startsWith('start_tools');
}

/**
 * Collects tool proficiencies that the character already has before the
 * current Artificer subclass grant is applied.
 *
 * `cls` should be the active class record passed to the adapter. This matters
 * for multiclass tabs, where `ctx.character.cls` is still the primary class.
 */
export function collectKnownArtificerToolKeys(ctx = {}, cls = null) {
  const character = ctx.character || {};
  const choices = ctx.choices || character.choices || {};
  const activeClass = cls || ctx.cls || character.cls || null;
  const out = new Set();

  const starting = activeClass?.startingProficiencies || {};
  addFixedToolBlocks(out, starting.tools);
  addFixedToolBlocks(out, starting.toolProficiencies);

  addFixedToolBlocks(out, character.backgroundObj?.toolProficiencies);
  addFixedToolBlocks(out, character.speciesObj?.toolProficiencies);

  Object.entries(choices).forEach(([key, value]) => {
    if (!choiceLooksLikeTool(key)) return;
    asArray(value).forEach((item) => addTool(out, item));
  });

  return out;
}

/**
 * Returns how many replacement artisan-tool choices a subclass must inject.
 * Example: Armorer grants Smith's Tools. If Smith's Tools is already known,
 * this returns 1, so the adapter can add a generic artisan-tool choice.
 */
export function getArtificerConditionalBonusToolCount(ctx = {}, requiredTools = [], cls = null) {
  const known = collectKnownArtificerToolKeys(ctx, cls);
  return asArray(requiredTools).reduce((count, tool) => (
    known.has(artificerToolKey(tool)) ? count + 1 : count
  ), 0);
}
