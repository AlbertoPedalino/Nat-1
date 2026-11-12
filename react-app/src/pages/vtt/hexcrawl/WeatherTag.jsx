import { useTheme } from '@mui/material';
import { hasWeatherDisadvantage, weatherName, weatherTone } from '../../../shared/gmboard/weather.js';
import { weatherIcon } from '../../../shared/hexcrawl/hexIcons.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The weather a hex was walked under, as one sticker: its icon and name in the
// weather's own colour, and, when it cost the party advantage, " ·
// disadvantage" in the warning tone, since that is what changes what the
// rolls meant. The same tag on the hex's bubble and in its result dialog.
// `weather` and `intensity` are the clock's.
export default function WeatherTag({ weather, intensity }) {
  const theme = useTheme();
  const Icon = weatherIcon(weather);
  const disadvantage = hasWeatherDisadvantage(weather, intensity);
  return (
    <TagChip
      icon={<Icon size={ICON_SIZES.xs} aria-hidden />}
      label={`${weatherName(weather, intensity)}${disadvantage ? ' · disadvantage' : ''}`}
      tone={disadvantage ? UI_COLORS.warning : weatherTone(theme.palette, weather)}
    />
  );
}
