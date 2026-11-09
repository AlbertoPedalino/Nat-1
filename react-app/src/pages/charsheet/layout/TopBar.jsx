import { useRef, useState } from 'react';
import { Box, Typography, Button, Chip, Menu, MenuItem } from '@mui/material';
import { ArrowLeft, Trash2, ImagePlus, Palette, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { levelFromXp, xpForLevel, xpProgressPct, MAX_LEVEL } from '../../../shared/character/progression/xp.js';
import IconColorPicker from '../../../shared/ui/IconColorPicker.jsx';
import PortraitBadge from '../../../shared/character/profile/PortraitBadge.jsx';
import { deletePortrait, uploadPortrait } from '../../../shared/cloud/api/characterArt.js';
import SheetActions from './SheetActions.jsx';
import XpDeltaControl from '../../../shared/character/progression/XpDeltaControl.jsx';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { classIcon } from '../../../shared/character/profile/classIcon.js';
import { getActiveCharId } from '../../../shared/character/profile/store.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { NEW_CHARACTER, characterBuilderPath } from '../../../shared/character/profile/characterRoutes.js';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../../app/navigation/AppTopBar.jsx';
import { appTopBarButtonSx } from '../../../shared/ui/appBar.js';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { sheetColumnSx } from './layout.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

export default function TopBar({ C, sheet, charId, readOnly = false, embedded = false, onShortRest, onLongRest, onUpdateXp, onUpdateCharacter }) {
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
  const navigate = useNavigate();
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
    <Box sx={{
      bgcolor: 'background.paper', borderBottom: 2, borderColor: 'divider',
    }}>
      {!embedded ? (
        <>
          <AppTopBar
            home
            start={readOnly ? null : (
              <Button size="small" variant="outlined" color="primary" startIcon={<ArrowLeft size={14} />}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  // Use the sheet's own id first: the online sheet route is
                  // /campaign-sheet?id=…, so params.get('char') is null there and we
                  // must not fall back to a stale gb:active_char (would open a blank
                  // or wrong builder). C.id covers chars whose id lives in the data.
                  const targetId = charId || C?.id
                    || params.get('char') || params.get('id')
                    || getActiveCharId() || NEW_CHARACTER;
                  navigate(characterBuilderPath(targetId));
                }}
                sx={appTopBarButtonSx}>
                Builder
              </Button>
            )}
          />
          <Box sx={{ height: APP_TOP_BAR_HEIGHT }} />
        </>
      ) : null}
      <Box sx={sheetColumnSx(embedded, { embeddedPx: '0.45rem' })}>
      {/* On a desktop three columns — identity, XP, actions — with XP in the
          middle; below that a column (see the XP and actions row). */}
      <Box sx={{
        display: embedded ? 'flex' : { xs: 'flex', md: 'grid' },
        gridTemplateColumns: { md: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
        alignItems: 'center', gap: embedded ? '0.4rem' : { xs: '0.4rem', md: '1rem' },
        flexDirection: 'column',
        py: embedded ? '0.35rem' : { xs: '0.35rem', md: '0.6rem' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: embedded ? '100%' : { xs: '100%', md: 'auto' } }}>
          <PortraitBadge
            path={C.portraitPath}
            color={C.classIconColor}
            size={embedded ? 36 : { xs: 36, md: 52 }}
            sx={{
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: embedded ? FONT_SIZES.body : { xs: FONT_SIZES.body, md: FONT_SIZES.heading },
              transition: 'border-color 0.15s',
              ...(readOnly ? {} : { '&:hover': { borderColor: UI_COLORS.accent } }),
            }}
            onClick={readOnly ? undefined : (event) => setBadgeAnchor(event.currentTarget)}
          >
            <Icon size={25} />
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
              <ImagePlus size={14} style={{ marginRight: 8 }} />
              {C.portraitPath ? 'Change portrait' : 'Add portrait'}
            </MenuItem>
            {C.portraitPath ? (
              <MenuItem onClick={handleRemovePortrait}>
                <Trash2 size={14} style={{ marginRight: 8 }} />
                Remove portrait
              </MenuItem>
            ) : null}
            <MenuItem onClick={(event) => { setColorAnchor(event.currentTarget); setBadgeAnchor(null); }}>
              <Palette size={14} style={{ marginRight: 8 }} />
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
              <Typography sx={{ ...TEXT_STYLES.title, fontSize: embedded ? FONT_SIZES.xxl : { xs: FONT_SIZES.xxl, md: FONT_SIZES.lead }, color: UI_COLORS.accentText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {C.name || 'Unnamed Character'}
              </Typography>
              {readOnly && (
                <Chip size="small" icon={<Eye size={11} />} label="READ ONLY"
                  sx={{ flexShrink: 0, height: 18, ...TEXT_STYLES.title, fontSize: FONT_SIZES.xxxs, color: UI_COLORS.infoText, borderColor: uiAlpha(UI_COLORS.infoText, OPACITY.edge), bgcolor: uiAlpha(UI_COLORS.infoText, OPACITY.soft), '& .MuiChip-icon': { color: UI_COLORS.infoText, ml: '4px' } }}
                  variant="outlined" />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[race, clsDisplay, bg].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>

        {/* XP and the actions: stacked on a phone, one row on a tablet; on a
            desktop the box dissolves and they take the grid's last columns. */}
        <Box sx={{
          display: embedded ? 'flex' : { xs: 'flex', md: 'contents' },
          alignItems: embedded ? 'stretch' : { xs: 'stretch', sm: 'center' },
          flexDirection: embedded ? 'column' : { xs: 'column', sm: 'row' },
          gap: embedded ? '0.4rem' : { xs: '0.4rem', sm: '1rem' },
          width: embedded ? '100%' : { xs: '100%', md: 'auto' },
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, width: embedded ? '100%' : { xs: '100%', sm: 'auto', md: 280, lg: 340 }, flex: embedded ? 'none' : { sm: 1, md: 'none' }, minWidth: 0, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%', gap: 1 }}>
              <Typography sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.xs, color: UI_COLORS.accentText }}>
                XP · Level {level}
              </Typography>
              <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {isMaxLevel ? `${formatNumber(currentXp)} XP` : `${formatNumber(currentXp)} / ${formatNumber(nextXp)}`}
              </Typography>
            </Box>
            <Box sx={{ ...SURFACES.panel, width: '100%', height: 8, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', bgcolor: 'primary.main', borderRadius: 1, transition: 'width 0.4s', width: `${Math.min(100, xpProgress)}%` }} />
            </Box>
            {!readOnly && (
              <XpDeltaControl
                currentXp={currentXp}
                onApply={(total) => onUpdateXp(String(total))}
                variant="compact"
                sx={{ width: embedded ? '100%' : { xs: '100%', md: 180 } }}
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
