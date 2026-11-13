import { normalizeEffects } from '../../../shared/character/combat/combatEffects.js';
import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';
import { MarkerClearAction } from '../../../shared/character/combat/MarkerManager.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';

// What the character has going right now — Bardic Inspiration, Guidance, Bless —
// by name, always in view, framed as Conditions beside it (MarkerManager). The
// field and the recent ones stay open under them — adding one is a single tap
// — the recent ones drawn as ghosts so the reminders in force lead. The same list rides above the character's piece on the battle map
// and on its encounter combatant. A reminder changes no roll and stays until
// someone removes it.
export default function RemindersBlock({ sheet, actions }) {
  const reminders = normalizeEffects(sheet.activeEffects);
  const readOnly = Boolean(actions.readOnly);
  return (
    <Panel icon={GAME_ICONS.reminders} title="Reminders" tone={PANEL_TONES.reminders} sx={{ flex: 1, minWidth: 140 }} bodySx={{ p: '0.4rem 0.62rem' }}
      action={readOnly ? null : <MarkerClearAction count={reminders.length} onClear={actions.clear} what="reminders" />}
    >
      <ReminderEditor
        effects={reminders}
        density="panel"
        disabled={readOnly}
        onAdd={actions.add}
        onRemove={actions.remove}
      />
    </Panel>
  );
}
