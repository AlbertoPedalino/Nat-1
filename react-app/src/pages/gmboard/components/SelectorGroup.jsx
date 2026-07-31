import { useId } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';

export default function SelectorGroup({
  label,
  options,
  value,
  onChange,
  getId = (o) => o.id,
  getLabel = (o) => o.label,
  getSub = (o) => o.sub,
  getIcon,
}) {
  const theme = useTheme();
  const labelId = useId();

  return (
    <Box>
      {label ? <Typography id={labelId} sx={groupLabelSx}>{label}</Typography> : null}
      <Box role="group" aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : 'options'} sx={groupRowSx}>
        {options.map((option) => {
          const id = getId(option);
          const selected = value === id;
          const Icon = getIcon ? getIcon(option) : null;
          return (
            <Button
              key={id}
              size="small"
              variant={selected ? 'contained' : 'outlined'}
              color={selected ? 'primary' : 'inherit'}
              aria-pressed={selected}
              onClick={() => onChange(option)}
              sx={{
                ...optionBtnSx,
                ...(selected
                  ? {}
                  : {
                      '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: '1px',
                      },
                    }),
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, gap: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  {Icon ? <Icon size={13} /> : null}
                  <span>{getLabel(option)}</span>
                </Box>
                {getSub(option) ? (
                  <Typography component="span" sx={selected ? selectedSubLabelSx : subLabelSx}>
                    {getSub(option)}
                  </Typography>
                ) : null}
              </Box>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}

const groupLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  mb: 0.5,
};

const groupRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
};

const optionBtnSx = {
  fontSize: '0.72rem',
  textTransform: 'none',
  minWidth: '72px',
};

const subLabelSx = {
  fontSize: '0.6rem',
  color: 'text.secondary',
  opacity: 0.8,
};

// On a contained button the gold background swallows text.secondary; inherit
// the button's contrastText instead and dim it with opacity only.
const selectedSubLabelSx = {
  fontSize: '0.6rem',
  color: 'inherit',
  opacity: 0.75,
};
