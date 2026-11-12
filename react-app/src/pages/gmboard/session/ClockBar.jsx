import { useState } from 'react';
import {
  Box, Button, Stack, Typography,
} from '@mui/material';
import { CalendarDays, Pencil } from 'lucide-react';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { formatDate, formatHM } from '../../../shared/gmboard/campaignTime.js';
import { WeatherCard } from '../../../shared/gmboard/ui/WeatherSummary.jsx';
import CampaignCalendarFields, { QUICK_HOURS, quickButtonSx } from '../../../shared/gmboard/ui/CampaignCalendarFields.jsx';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import BoardPanel from '../ui/BoardPanel.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The campaign's clock at a glance: date, time and weather in one strip, with
// the quick steps of time passing. Setting the date, the season or a forced
// weather is rarer, and lives behind Edit (the same calendar fields as the
// battle map's hexcrawl settings).
export default function ClockBar() {
  const {
    state, setStart, setSeason, setWeatherOverride, advanceManual,
  } = useGmBoard();
  const [editing, setEditing] = useState(false);

  return (
    <BoardPanel
      icon={CalendarDays}
      title="Clock & weather"
      actions={(
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
          {QUICK_HOURS.slice(0, 3).map((hours) => (
            <Button key={hours} size="small" variant="outlined" color="inherit" onClick={() => advanceManual(hours)} sx={quickButtonSx}>
              +{hours}h
            </Button>
          ))}
          <Button size="small" variant="outlined" startIcon={<Pencil size={ICON_SIZES.xs} />} onClick={() => setEditing(true)}>
            Edit
          </Button>
        </Stack>
      )}
    >
      <Box sx={stripSx}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={dateSx}>{formatDate(state)}</Typography>
          <Typography sx={timeSx}>{formatHM(state.min)}</Typography>
        </Box>
        <WeatherCard clock={state} sx={WEATHER_CARD_SX} />
      </Box>

      <SheetDialog
        open={editing}
        onClose={() => setEditing(false)}
        maxWidth="sm"
        title="Clock & weather"
        icon={<CalendarDays size={ICON_SIZES.lg} />}
        actions={<Button onClick={() => setEditing(false)}>Done</Button>}
      >
        <CampaignCalendarFields
          clock={state}
          season={state.season}
          onDateTime={setStart}
          onAdvance={advanceManual}
          onSeason={setSeason}
          onWeather={setWeatherOverride}
        />
      </SheetDialog>
    </BoardPanel>
  );
}

const stripSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: 'space-between',
  gap: 1.5,
};

const dateSx = {
  ...TEXT_STYLES.figure,
  fontSize: { xs: FONT_SIZES.body, sm: FONT_SIZES.title },
  lineHeight: LINE_HEIGHTS.snug,
  color: 'primary.main',
};

const timeSx = {
  ...TEXT_STYLES.figure,
  fontSize: { xs: FONT_SIZES.heading, sm: FONT_SIZES.display },
  lineHeight: LINE_HEIGHTS.tight,
};

// Beside the date on a wide screen, the card keeps a readable width.
const WEATHER_CARD_SX = { minWidth: { sm: 280 } };
