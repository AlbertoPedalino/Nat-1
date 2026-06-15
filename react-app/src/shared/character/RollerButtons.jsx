import { Button } from '@mui/material';
import { Cross, Dices, Shield, Sword } from 'lucide-react';
import { formatRollTitle, rollFormula } from './dice.js';
import { normalizeRollerKind, resolveRollers } from './rollers.js';

const ROLLER_PRESENTATION = {
  damage: {
    verb: 'Dmg',
    title: 'Damage',
    Icon: Sword,
    tone: { borderColor: 'rgba(255,107,53,0.4)', color: '#ff6b35' },
  },
  heal: {
    verb: 'Heal',
    title: 'Heal',
    Icon: Cross,
    tone: { borderColor: 'rgba(88,184,121,0.4)', color: '#58b879' },
  },
  utility: {
    verb: 'Roll',
    title: 'Roll',
    Icon: Dices,
    tone: { borderColor: 'rgba(77,149,214,0.4)', color: '#4d95d6' },
  },
  tempHp: {
    verb: 'Temp HP',
    title: 'Temp HP',
    Icon: Shield,
    tone: { borderColor: 'rgba(62,142,90,0.45)', color: '#3e8e5a' },
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
          const { total, rolls } = rollFormula(roller.formula);
          onShowToast(formatRollTitle(subject, title), roller.formula, total, rolls);
        }}
        sx={{ ...buttonSx, ...presentation.tone }}
      >
        <RollerIcon size={12} style={{ marginRight: 2 }} />
        {buttonLabel}
      </Button>
    );
  });
}
