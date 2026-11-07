import { parseBeastActions } from './beasts.js';
import { getActiveWildShape } from './wildShapeForm.js';

// Beast attacks/actions while Wild Shaped → action cards. Reads the active form
// snapshot on the character (no beast DB needed here): attacks become rollable
// attack cards (beast's own to-hit + damage), other actions become info cards.
export function makeWildShapeActions(C) {
  const active = getActiveWildShape(C);
  if (!active?.beast) return [];
  const beast = active.beast;
  const beastName = beast.name;
  // Every form-granted action/attack/bonus/reaction shares the section list with
  // the Druid's own, so each carries a "Wild Shape" tag to mark its source.
  const toCard = (a, cat) => {
    const rollers = (a.damage || []).map((formula, i) => ({
      kind: 'damage',
      formula,
      label: `Damage ${formula}`,
      key: `wildshape-dmg-${i}`,
    }));
    return {
      name: a.name,
      cat,
      uses: 'Wild Shape',
      _source: `Wild Shape (${beastName})`,
      _colorBarCat: a.isAttack ? 'attack' : undefined,
      _wildShapeTag: true,
      ...(a.attackBonus != null ? { attackBonus: a.attackBonus } : {}),
      ...(rollers.length ? { rollers } : {}),
      rollLabelPrefix: `${beastName}: ${a.name}`,
      entries: a.text ? [a.text] : null,
      noDescription: !a.text,
    };
  };
  return [
    ...parseBeastActions(beast.actions).map((a) => toCard(a, a.isAttack ? 'attack' : 'action')),
    ...parseBeastActions(beast.bonusActions).map((a) => toCard(a, 'bonus')),
    ...parseBeastActions(beast.reactions).map((a) => toCard(a, 'reaction')),
  ];
}
