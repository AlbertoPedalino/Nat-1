import { useState } from 'react';
import { Box, Stack, ToggleButton, Typography } from '@mui/material';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { ATMOSPHERE_PRESETS } from '../../../shared/vtt/scene/atmosphere.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { SURFACES, tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { ATMOSPHERE_ICONS, FALLBACK_ATMOSPHERE_ICON } from '../../../shared/ui/gameIcons.js';

// The searchable grid of atmosphere presets, opened from the scene panel's
// Light & weather section.

export const atmospherePresetsByType = new Map(
  ATMOSPHERE_PRESETS.map((preset) => [preset.value, preset]),
);

function AtmosphereOption({ type, selected, onSelect }) {
  const preset = atmospherePresetsByType.get(type);
  const Icon = ATMOSPHERE_ICONS[type] || FALLBACK_ATMOSPHERE_ICON;
  return (
    <ToggleButton
      value={type}
      selected={selected}
      onClick={() => onSelect(type)}
      aria-label={preset.label}
      sx={{
        ...SURFACES.mapControl,
        minWidth: 0,
        justifyContent: 'flex-start',
        gap: 0.75,
        px: 1,
        py: 0.75,
        borderRadius: (theme) => `${theme.shape.borderRadius * 0.875}px !important`,
        color: VTT_COLORS.textSecondary,
        '&:hover': {
          borderColor: vttAlpha(VTT_COLORS.accent, OPACITY.heavy),
          // Over the control's own solid surface, not in place of it.
          ...tintedSurfaceSx(VTT_COLORS.accent, { base: VTT_COLORS.surface }),
          color: VTT_COLORS.text,
        },
      }}
    >
      <Icon size={ICON_SIZES.sm} strokeWidth={1.8} />
      <Typography
        component="span"
        variant="caption"
        noWrap
        sx={{ minWidth: 0, fontWeight: selected ? FONT_WEIGHTS.bold : FONT_WEIGHTS.regular }}
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
    <Stack spacing={0.75} role="group" aria-label="Atmosphere">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search atmospheres…"
        ariaLabel="Search atmospheres"
        autoFocus
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.5 }}>
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
        <EmptyLine inList>No atmospheres found.</EmptyLine>
      ) : null}
    </Stack>
  );
}
