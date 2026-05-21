export const SHEET_GRID_ITEM_SX = {
  minWidth: 0,
  alignSelf: 'start',
  overflow: 'hidden',
};

export const SHEET_GRID = {
  gridTemplateColumns: { xs: '1fr', md: '200px 210px 1fr' },
  gridTemplateAreas: {
    xs: `
      "saves"
      "skills"
      "senses"
      "movement"
      "profs"
      "hitdice"
      "right"
    `,
    md: `
      "saves    skills right"
      "senses   skills right"
      "movement skills right"
      "profs    skills right"
      "hitdice  skills right"
    `,
  },
  gap: '0.55rem',
};
