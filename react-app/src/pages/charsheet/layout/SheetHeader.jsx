import { useRef, useState } from 'react';
import { Box, Typography, Menu, MenuItem } from '@mui/material';
import { Trash2, ImagePlus, Palette, Eye } from 'lucide-react';
import { levelFromXp, xpForLevel, xpProgressPct, MAX_LEVEL } from '../../../shared/character/progression/xp.js';
import IconColorPicker from '../../../shared/ui/IconColorPicker.jsx';
import PortraitBadge from '../../../shared/character/profile/PortraitBadge.jsx';
import CharacterName from '../../../shared/character/profile/CharacterName.jsx';
import { deletePortrait, uploadPortrait } from '../../../shared/cloud/api/characterArt.js';
import SheetActions from './SheetActions.jsx';
import XpDeltaControl from '../../../shared/character/progression/XpDeltaControl.jsx';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { classIcon } from '../../../shared/character/profile/classIcon.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { sheetColumnSx, sheetResponsive } from './layout.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';
import { TEXT_STYLES, ONE_LINE_SX } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import SegmentedMeter from '../../../shared/ui/SegmentedMeter.jsx';
import { METER_SEGMENTS } from '../../../shared/ui/shapes.js';

// The character's own header, the band the sheet opens on under the app's top
// bar (AppPage): portrait, name, class line, XP and the rests. Page content,
// not a bar: the navigation (Home, Builder) is the app's top bar's.
export default function SheetHeader({ C, sheet, charId, readOnly = false, embedded = false, onShortRest, onLongRest, onUpdateXp, onUpdateCharacter }) {
  const { notify } = useToast();
  const [colorAnchor, setColorAnchor] = useState(null);
  const [badgeAnchor, setBadgeAnchor] = useState(null);
  const portraitInputRef = useRef(null);

  // The path goes into the character like any other field, so it travels with
  // the sheet and is what every other screen reads. The picture itself is in the
  // bucket, and a copy of it stays in this browser.
  const handlePortraitPicked = async (event) => {
    const file = event.target.files?.[0];
    // Cleared straight away, or picking the same file twice in a row is silent.
    event.target.value = '';
    if (!file) return;
    try {
      const path = await uploadPortrait(charId, file);
      const previous = C.portraitPath;
      onUpdateCharacter?.((prev) => ({ ...prev, portraitPath: path }));
      if (previous) deletePortrait(previous);
      notify('success', 'Portrait updated.');
    } catch (cause) {
      notify('error', failureMessage('Could not use that image.', cause));
    }
  };

  const handleRemovePortrait = () => {
    setBadgeAnchor(null);
    const previous = C.portraitPath;
    onUpdateCharacter?.((prev) => ({ ...prev, portraitPath: null }));
    if (previous) deletePortrait(previous);
    notify('success', 'Portrait removed.');
  };
  const extra = C.extraClasses || [];
  const pLv = primaryClassLevel(C);
  const sc = C.subclassShortName ? ` (${C.subclassShortName})` : '';
  const race = C.speciesName || '';
  const bg = C.backgroundName || '';
  const Icon = classIcon(C.className);

  let clsDisplay;
  if (extra.length) {
    const parts = [`${C.className || '—'}${sc} ${pLv}`];
    extra.forEach(ec => {
      const s = ec.subclassShortName ? ` (${ec.subclassShortName})` : '';
      parts.push(`${ec.name}${s} ${ec.level || 1}`);
    });
    clsDisplay = parts.join(' / ') + ` [Lv.${C.level}]`;
  } else {
    clsDisplay = (C.className || '—') + sc + ' Lv.' + C.level;
  }

  const currentXp = sheet.xpStored;
  const level = levelFromXp(currentXp);
  const isMaxLevel = level >= MAX_LEVEL;
  const nextXp = xpForLevel(level + 1);
  const xpProgress = xpProgressPct(currentXp, level);

  return (
    <Box sx={SURFACES.pageHeader}>
      <Box sx={sheetColumnSx(embedded, { embeddedPx: '0.45rem' })}>
      {/* On a desktop three columns — identity, XP, actions — with XP in the
          middle; below that a column (see the XP and actions row). */}
      <Box sx={{
        display: sheetResponsive(embedded, { xs: 'flex', md: 'grid' }),
        gridTemplateColumns: { md: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
        alignItems: 'center', gap: sheetResponsive(embedded, { xs: '0.4rem', md: '1rem' }),
        flexDirection: 'column',
        py: sheetResponsive(embedded, { xs: '0.35rem', md: '0.6rem' }),
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: sheetResponsive(embedded, { xs: '100%', md: 'auto' }) }}>
          <PortraitBadge
            path={C.portraitPath}
            color={C.classIconColor}
            size={sheetResponsive(embedded, { xs: 36, md: 52 })}
            sx={{
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: sheetResponsive(embedded, { xs: FONT_SIZES.body, md: FONT_SIZES.heading }),
              transition: 'border-color 0.15s',
              ...(readOnly ? {} : { '&:hover': { borderColor: UI_COLORS.accent } }),
            }}
            onClick={readOnly ? undefined : (event) => setBadgeAnchor(event.currentTarget)}
          >
            <Icon size={ICON_SIZES.display} />
          </PortraitBadge>

          {/* The badge used to open the colour picker straight away. It now asks
              which of the two you meant, because a portrait replaces the icon
              the colour is for. */}
          <Menu
            anchorEl={badgeAnchor}
            open={Boolean(badgeAnchor)}
            onClose={() => setBadgeAnchor(null)}
          >
            <MenuItem onClick={() => { setBadgeAnchor(null); portraitInputRef.current?.click(); }}>
              <ImagePlus size={ICON_SIZES.sm} style={{ marginRight: 8 }} />
              {C.portraitPath ? 'Change portrait' : 'Add portrait'}
            </MenuItem>
            {C.portraitPath ? (
              <MenuItem onClick={handleRemovePortrait}>
                <Trash2 size={ICON_SIZES.sm} style={{ marginRight: 8 }} />
                Remove portrait
              </MenuItem>
            ) : null}
            <MenuItem onClick={(event) => { setColorAnchor(event.currentTarget); setBadgeAnchor(null); }}>
              <Palette size={ICON_SIZES.sm} style={{ marginRight: 8 }} />
              Icon colour
            </MenuItem>
          </Menu>

          <Box
            component="input"
            type="file"
            accept="image/*"
            ref={portraitInputRef}
            onChange={handlePortraitPicked}
            sx={{ display: 'none' }}
          />
          <IconColorPicker
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            currentColor={C.classIconColor}
            onSelect={(color) => onUpdateCharacter?.(prev => ({ ...prev, classIconColor: color }))}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <CharacterName name={C.name} sx={{ fontSize: sheetResponsive(embedded, { xs: FONT_SIZES.xxl, md: FONT_SIZES.lead }) }} />
              {readOnly && (
                <TagChip icon={<Eye size={ICON_SIZES.xxs} />} label="Read only" tone={UI_COLORS.infoText} />
              )}
            </Box>
            <Typography variant="body2" sx={{ ...ONE_LINE_SX, color: 'text.secondary' }}>
              {[race, clsDisplay, bg].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>

        {/* XP and the actions: stacked on a phone, one row on a tablet; on a
            desktop the box dissolves and they take the grid's last columns. */}
        <Box sx={{
          display: sheetResponsive(embedded, { xs: 'flex', md: 'contents' }),
          alignItems: sheetResponsive(embedded, { xs: 'stretch', sm: 'center' }),
          flexDirection: sheetResponsive(embedded, { xs: 'column', sm: 'row' }),
          gap: sheetResponsive(embedded, { xs: '0.4rem', sm: '1rem' }),
          width: sheetResponsive(embedded, { xs: '100%', md: 'auto' }),
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: sheetResponsive(embedded, { xs: '100%', sm: 'auto', md: 280, lg: 340 }), flex: sheetResponsive(embedded, { xs: 'none', sm: 1, md: 'none' }), minWidth: 0, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%', gap: 1 }}>
              <Typography sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.xs, color: UI_COLORS.accentText }}>
                XP · Level {level}
              </Typography>
              <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {isMaxLevel ? `${formatNumber(currentXp)} XP` : `${formatNumber(currentXp)} / ${formatNumber(nextXp)}`}
              </Typography>
            </Box>
            <SegmentedMeter
              ratio={Math.min(100, xpProgress) / 100}
              tone={UI_COLORS.accent}
              segments={METER_SEGMENTS.smooth}
              title="Experience"
              valueText={isMaxLevel ? `${formatNumber(currentXp)} XP` : `${formatNumber(currentXp)} of ${formatNumber(nextXp)} XP`}
              sx={{ width: '100%', height: 10 }}
            />
            {!readOnly && (
              <XpDeltaControl
                currentXp={currentXp}
                onApply={(total) => onUpdateXp(String(total))}
                variant="compact"
                sx={{ width: sheetResponsive(embedded, { xs: '100%', md: 180 }) }}
              />
            )}
          </Box>

          <SheetActions readOnly={readOnly} embedded={embedded} onShortRest={onShortRest} onLongRest={onLongRest} />
        </Box>
      </Box>
      </Box>
    </Box>
  );
}
