import { SURFACES } from '../../ui/surfaces.js';
// The GM Board's two surfaces, here so the board, the battle map's hexcrawl
// and the guide draw them alike.

// A panel (BoardPanel, a guide card): a bordered paper box.
export const boardPanelSx = {
  ...SURFACES.panel,
  p: 1.5,
};

// A bordered box inside a panel: a quest's header, the roll history, a hex
// result, the table being edited.
export const boardInsetSx = {
  p: 1.25,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};

// The cards a generator or the roller lays out (rooms, quests, roll results):
// one column on a phone, two on a tablet, three on a desktop.
export const boardCardGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
  gap: 1.25,
};
