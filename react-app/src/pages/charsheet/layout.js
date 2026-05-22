export const SHEET_AREAS = {
  saves: 'saves',
  senses: 'senses',
  movement: 'movement',
  profs: 'profs',
  hitdice: 'hitdice',
  skills: 'skills',
  right: 'right',
  leftCol: 'leftCol',
};

export const SHEET_GRID_ITEM_SX = {
  minWidth: 0,
  overflow: 'hidden',
};

export const SHEET_GRID = {
  gridTemplateColumns: { xs: '1fr', md: '200px 210px 1fr' },
  gridTemplateAreas: {
    xs: `
      "${SHEET_AREAS.saves}"
      "${SHEET_AREAS.skills}"
      "${SHEET_AREAS.senses}"
      "${SHEET_AREAS.movement}"
      "${SHEET_AREAS.profs}"
      "${SHEET_AREAS.hitdice}"
      "${SHEET_AREAS.right}"
    `,
    md: `"${SHEET_AREAS.leftCol} ${SHEET_AREAS.skills} ${SHEET_AREAS.right}"`,
  },
  gap: '0.55rem',
};
