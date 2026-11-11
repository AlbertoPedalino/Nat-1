import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';

// What the character has going right now — Bardic Inspiration, Guidance, Bless —
// by name, always in view, framed like Conditions above it. The same list
// rides above the character's piece on the battle map and on its encounter
// combatant. A reminder changes no roll and stays until someone removes it.
export default function RemindersBlock({ sheet, actions }) {
  return (
    <Panel icon={GAME_ICONS.reminders} title="Reminders" tone={UI_COLORS.spell} sx={{ flex: 1, minWidth: 140, mt: '0.4rem' }} bodySx={{ p: '0.4rem 0.62rem' }}>
      <ReminderEditor
        effects={sheet.activeEffects}
        disabled={Boolean(actions.readOnly)}
        fontSize={FONT_SIZES.xxs}
        onAdd={actions.add}
        onRemove={actions.remove}
      />
    </Panel>
  );
}
