// The GM Board's two surfaces, here so the board, the battle map's hexcrawl
// and the guide draw them alike.

// A panel (BoardPanel, a guide card): a bordered paper box.
export const boardPanelSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

// A bordered box inside a panel: a quest's header, the roll history, a hex
// result, the table being edited.
export const boardInsetSx = {
  p: 1.25,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};
