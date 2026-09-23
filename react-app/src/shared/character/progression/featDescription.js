import { entriesToTextBlocks } from '../spells/spellEntries.js';

const ABILITIES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

function joinOptions(options, conjunction = 'or') {
  if (options.length < 2) return options[0] || '';
  if (options.length === 2) return options.join(` ${conjunction} `);
  return `${options.slice(0, -1).join(', ')}, ${conjunction} ${options.at(-1)}`;
}

function describeAbilityOption(ability) {
  if (!ability || typeof ability !== 'object') return '';
  const max = Number(ability.max) || 20;
  const parts = Object.entries(ABILITIES).flatMap(([key, name]) => {
    const amount = Number(ability[key]);
    return amount > 0 ? [`Increase your ${name} score by ${amount}, to a maximum of ${max}.`] : [];
  });
  const choose = ability.choose;
  if (choose && typeof choose === 'object') {
    const from = [...new Set(choose.from || choose.weighted?.from || [])].filter((key) => ABILITIES[key]);
    if (from.length) {
      const names = from.map((key) => ABILITIES[key]);
      const any = from.length === Object.keys(ABILITIES).length;
      const limit = Number(choose.max) || max;
      const weights = choose.weighted?.weights;
      if (Array.isArray(weights) && weights.length) {
        parts.push(`Increase ${weights.length} different ability scores${any ? ' of your choice' : ` chosen from ${joinOptions(names)}`} by ${joinOptions(weights, 'and')} respectively, to a maximum of ${limit}.`);
      } else {
        const count = Number(choose.count) || 1;
        const amount = Number(choose.amount) || 1;
        const target = count === 1
          ? (any ? 'one ability score of your choice' : `your ${joinOptions(names)} score`)
          : `${count} different ability scores${any ? ' of your choice' : ` chosen from ${joinOptions(names)}`}`;
        parts.push(`Increase ${target} by ${amount}${count > 1 ? ' each' : ''}, to a maximum of ${limit}.`);
      }
    }
  }
  return parts.join(' ');
}

// Feat records store ASIs separately from entries. Render them wherever the
// feat's full description appears, without modifying the stored source record.
export function featDescriptionEntries(feat) {
  const entries = feat?.entries == null ? [] : Array.isArray(feat.entries) ? feat.entries : [feat.entries];
  const alternatives = [...new Set((Array.isArray(feat?.ability) ? feat.ability : []).map(describeAbilityOption).filter(Boolean))];
  if (!alternatives.length) return entries;
  const text = entriesToTextBlocks(entries).map((block) => block.text || '').join(' ');
  // Some records already spell out the increase, including the ASI feat itself.
  if (/ability score (?:increase|improvement)\b/i.test(text)
    || /increase\b[^.!?]{0,160}\bscore(?:s)?\b[^.!?]{0,100}\bby\s+\d/i.test(text)) return entries;
  const summary = alternatives.length === 1
    ? [`{@b Ability Score Increase.} ${alternatives[0]}`]
    : ['{@b Ability Score Increase.} Choose one of the following:', { type: 'list', items: alternatives }];
  return [...summary, ...entries];
}
