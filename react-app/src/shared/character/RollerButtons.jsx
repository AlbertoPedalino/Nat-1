import { Button } from '@mui/material';
import { Cross, Dices, Shield, Sword } from 'lucide-react';
import { formatRollTitle, rollFormula } from './dice.js';
import { normalizeRollerKind, resolveRollers } from './rollers.js';
import { ROLL_TONES, rollerToneSx } from '../entityColors.js';

const ROLLER_PRESENTATION = {
  damage: {
    verb: 'Dmg',
    title: 'Damage',
    Icon: Sword,
    tone: rollerToneSx(ROLL_TONES.damage),
  },
  heal: {
    verb: 'Heal',
    title: 'Heal',
    Icon: Cross,
    tone: rollerToneSx(ROLL_TONES.heal),
  },
  utility: {
    verb: 'Roll',
    title: 'Roll',
    Icon: Dices,
    tone: rollerToneSx(ROLL_TONES.utility),
  },
  tempHp: {
    verb: 'Temp HP',
    title: 'Temp HP',
    Icon: Shield,
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
    const buttonLabel = roller.kind === 'damage'
      ? `${presentation.verb} ${roller.formula}`
      : (roller.label || `${presentation.verb} ${roller.formula}`);
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
            modifier ? { bonus: modifier } : undefined,
          );
        }}
        sx={{ ...buttonSx, ...presentation.tone }}
      >
        <RollerIcon size={12} style={{ marginRight: 2 }} />
        {buttonLabel}
      </Button>
    );
  });
}
