// Top-bar buttons that keep only their icon on a phone, where the bar has no
// room for words. Put the button's text in a span with phoneHiddenLabelSx and
// give the button an aria-label, so it still has a name once the text is gone.
export const iconOnlyOnPhoneButtonSx = {
  minWidth: { xs: 32, sm: 64 },
  px: { xs: 0.75, sm: 1.25 },
  '& .MuiButton-startIcon': {
    mr: { xs: 0, sm: 1 },
    ml: 0,
  },
};

export const phoneHiddenLabelSx = {
  display: { xs: 'none', sm: 'inline' },
};
