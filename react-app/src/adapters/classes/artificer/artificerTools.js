import { asArray } from '../../../shared/lists.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { PROFICIENCY_CHOICE_KEYS } from '../../../shared/character/progression/typedProficiencies.js';
import { stripMarkup } from '../../../shared/content/markupText.js';
import { normalizeCharacterChoices } from '../../../shared/character/progression/choiceNormalization.js';

export function normalizeArtificerTool(value) {
  if (!value) return '';

  const raw = stripMarkup(value)
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
  return matchKey(normalizeArtificerTool(value));
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
      .filter((key) => !PROFICIENCY_CHOICE_KEYS.includes(key) && block[key] !== false)
      .forEach((key) => addTool(out, key));
  });
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

  // Picked tools: the one reading of the builder's choices.
  normalizeCharacterChoices({ choices }).tools.forEach((item) => addTool(out, item));

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
