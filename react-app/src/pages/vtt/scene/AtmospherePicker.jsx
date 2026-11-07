import { useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  ToggleButton,
  Typography,
} from '@mui/material';
import {
  Ban,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Coins,
  Flame,
  House,
  Snowflake,
  SunMedium,
  ThermometerSun,
  Trees,
  Wind,
} from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { ATMOSPHERE_PRESETS } from '../../../shared/vtt/scene/atmosphere.js';

// The searchable grid of atmosphere presets, opened from the scene panel's
// Light & weather section.

export const ATMOSPHERE_ICONS = Object.freeze({
  none: Ban,
  rain: CloudRain,
  storm: CloudLightning,
  wind: Wind,
  fog: CloudFog,
  snow: Snowflake,
  blizzard: CloudSnow,
  sandstorm: Cloud,
  fire: Flame,
  heatwave: ThermometerSun,
  sunrays: SunMedium,
  swamp: Trees,
  haunted: House,
  goldvault: Coins,
});

export const atmospherePresetsByType = new Map(
  ATMOSPHERE_PRESETS.map((preset) => [preset.value, preset]),
);

function AtmosphereOption({ type, selected, onSelect }) {
  const preset = atmospherePresetsByType.get(type);
  const Icon = ATMOSPHERE_ICONS[type] || Cloud;
  return (
    <ToggleButton
      value={type}
      selected={selected}
      onClick={() => onSelect(type)}
      aria-label={preset.label}
      sx={{
        minWidth: 0,
        justifyContent: 'flex-start',
        gap: 0.75,
        px: 1,
        py: 0.7,
        border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}`,
        borderRadius: '7px !important',
        bgcolor: vttAlpha(VTT_COLORS.ink, 0.85),
        color: VTT_COLORS.railText,
        textTransform: 'none',
        '&:hover': {
          borderColor: vttAlpha(VTT_COLORS.gold, 0.68),
          bgcolor: vttAlpha(VTT_COLORS.gold, 0.12),
          color: VTT_COLORS.panelText,
        },
        '&.Mui-selected': {
          borderColor: VTT_COLORS.gold,
          bgcolor: VTT_COLORS.gold,
          color: VTT_COLORS.ink,
        },
        '&.Mui-selected:hover': {
          borderColor: VTT_COLORS.goldBright,
          bgcolor: VTT_COLORS.goldBright,
          color: VTT_COLORS.ink,
        },
      }}
    >
      <Icon size={15} strokeWidth={1.8} />
      <Typography
        component="span"
        variant="caption"
        noWrap
        sx={{ minWidth: 0, fontWeight: selected ? 700 : 500 }}
      >
        {preset.label}
      </Typography>
    </ToggleButton>
  );
}

export function AtmospherePicker({ value, onSelect }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visiblePresets = ATMOSPHERE_PRESETS.filter((preset) => (
    !normalizedQuery
    || preset.label.toLocaleLowerCase().includes(normalizedQuery)
    || preset.value.toLocaleLowerCase().includes(normalizedQuery)
  ));

  return (
    <Stack spacing={0.85} role="group" aria-label="Atmosphere">
      <TextField
        size="small"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search atmospheres…"
        slotProps={{ htmlInput: { 'aria-label': 'Search atmospheres' } }}
        autoFocus
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.55 }}>
        {visiblePresets.map((preset) => (
          <AtmosphereOption
            key={preset.value}
            type={preset.value}
            selected={value === preset.value}
            onSelect={onSelect}
          />
        ))}
      </Box>
      {visiblePresets.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', py: 1, textAlign: 'center' }}>
          No atmospheres found
        </Typography>
      ) : null}
    </Stack>
  );
}
