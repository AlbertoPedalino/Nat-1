import { Button } from '@mui/material';
import { formatRollTitle, rollFormula } from './dice.js';
import { normalizeRollerKind, resolveRollers } from './rollers.js';
import { ROLL_TONES, rollerToneSx } from '../../ui/entityColors.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { GAME_ICONS } from '../../ui/gameIcons.js';
import RollerVerb from './RollerVerb.jsx';

const ROLLER_PRESENTATION = {
  damage: {
    verb: 'Dmg',
    title: 'Damage',
    Icon: GAME_ICONS.damage,
    tone: rollerToneSx(ROLL_TONES.damage),
  },
  heal: {
    verb: 'Heal',
    title: 'Heal',
    Icon: GAME_ICONS.heal,
    tone: rollerToneSx(ROLL_TONES.heal),
  },
  utility: {
    verb: 'Roll',
    title: 'Roll',
    Icon: GAME_ICONS.roll,
    tone: rollerToneSx(ROLL_TONES.utility),
  },
  // A die added to someone's roll (Guidance, Bardic Inspiration…).
  bonus: {
    verb: 'Bonus',
    title: 'Bonus',
    Icon: GAME_ICONS.bonus,
    tone: rollerToneSx(ROLL_TONES.utility),
  },
  tempHp: {
    verb: 'Temp HP',
    title: 'Temp HP',
    Icon: GAME_ICONS.tempHp,
    tone: rollerToneSx(ROLL_TONES.tempHp),
  },
};

function getPresentation(kind) {
  return ROLLER_PRESENTATION[normalizeRollerKind(kind)] || ROLLER_PRESENTATION.damage;
}

export default function RollerButtons({
  rollers,
  context,
  subject,
  titleSuffix = '',
  onShowToast,
  buttonSx,
}) {
  const resolvedRollers = resolveRollers(rollers, context);

  return resolvedRollers.map((roller, index) => {
    const presentation = getPresentation(roller.kind);
    const RollerIcon = presentation.Icon;
    // A custom label replaces verb and formula alike; damage always shows
    // its formula. `roller.verb` renames the kind's verb (a spell's "Bonus").
    const custom = roller.kind !== 'damage' && roller.label;
    const verb = custom ? '' : (roller.verb || presentation.verb);
    const text = custom ? roller.label : roller.formula;
    const title = `${roller.title || presentation.title}${titleSuffix}`;

    return (
      <Button
        key={roller.key || `${roller.kind}-${roller.formula}-${index}`}
        size="small"
        variant="outlined"
        onClick={(event) => {
          event.stopPropagation();
          if (typeof onShowToast !== 'function') return;
          const result = rollFormula(roller.formula);
          if (!result.valid) return;
          const { total, rolls, modifier } = result;
          onShowToast(
            formatRollTitle(subject, title),
            roller.formula,
            total,
            rolls,
            { ...(modifier ? { bonus: modifier } : null), kind: normalizeRollerKind(roller.kind) },
          );
        }}
        sx={{ ...buttonSx, ...presentation.tone }}
      >
        <RollerIcon size={ICON_SIZES.xs} style={{ marginRight: 2 }} />
        <RollerVerb>{verb}</RollerVerb>{text}
      </Button>
    );
  });
}
