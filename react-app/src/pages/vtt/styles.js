export const noticeSx = { color: 'text.secondary', fontStyle: 'italic' };

export const errorSx = { color: 'error.main', mb: 1 };

// The GM's scenes and the tables they play at are two separate concerns stacked
// on the same screen, so they get real space between them rather than reading as
// one list.
export const rootStackSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
