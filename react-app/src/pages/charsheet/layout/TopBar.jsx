import { useRef, useState } from 'react';
import { Box, Typography, Button, Chip, Menu, MenuItem } from '@mui/material';
import { ArrowLeft, Trash2, ImagePlus, Palette, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { levelFromXp, xpForLevel, xpProgressPct, MAX_LEVEL } from '../../../shared/character/progression/xp.js';
import { rollFormula as rollFormulaDice, formatRollTitle } from '../../../shared/character/dice/dice.js';
import IconColorPicker from '../../../shared/ui/IconColorPicker.jsx';
import PortraitBadge from '../../../shared/character/profile/PortraitBadge.jsx';
import { deletePortrait, uploadPortrait } from '../../../shared/cloud/api/characterArt.js';
import RollLogDialog from './RollLogDialog.jsx';
import SheetActions from './SheetActions.jsx';
import XpDeltaControl from '../../../shared/character/progression/XpDeltaControl.jsx';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { classIcon } from '../../../shared/character/profile/classIcon.js';
import CustomRollDialog from '../../../shared/character/dice/CustomRollDialog.jsx';
import { getActiveCharId } from '../../../shared/character/profile/store.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { NEW_CHARACTER, characterBuilderPath } from '../../../shared/character/profile/characterRoutes.js';
import AppTopBar, { APP_TOP_BAR_HEIGHT, appTopBarButtonSx } from '../../../app/navigation/AppTopBar.jsx';

export default function TopBar({ C, sheet, charId, readOnly = false, embedded = false, onShortRest, onLongRest, onUpdateXp, onUpdateCharacter, rollLog, onClearRollLog, onShowToast }) {
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
    } catch (cause) {
      onShowToast?.('Portrait', cause?.message || 'Could not use that image.', null, null);
    }
  };

  const handleRemovePortrait = () => {
    setBadgeAnchor(null);
    const previous = C.portraitPath;
    onUpdateCharacter?.((prev) => ({ ...prev, portraitPath: null }));
    if (previous) deletePortrait(previous);
  };
  const [rollLogOpen, setRollLogOpen] = useState(false);
  const [customRollOpen, setCustomRollOpen] = useState(false);
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
      <Box sx={{ maxWidth: embedded ? 'none' : 1280, mx: embedded ? 0 : { md: 'auto' }, px: embedded ? '0.45rem' : { xs: '0.6rem', md: '1.1rem' } }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: embedded ? '0.4rem' : { xs: '0.4rem', md: '1rem' },
        flexDirection: embedded ? 'column' : { xs: 'column', md: 'row' },
        justifyContent: embedded ? 'flex-start' : { md: 'space-between' },
        py: embedded ? '0.35rem' : { xs: '0.35rem', md: '0.6rem' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: embedded ? '100%' : { xs: '100%', md: 'auto' } }}>
          <PortraitBadge
            path={C.portraitPath}
            color={C.classIconColor}
            size={embedded ? 36 : { xs: 36, md: 52 }}
            sx={{
              cursor: readOnly ? 'default' : 'pointer',
              fontSize: embedded ? '1rem' : { xs: '1rem', md: '1.4rem' },
              transition: 'border-color 0.15s',
              ...(readOnly ? {} : { '&:hover': { borderColor: UI_COLORS.gold } }),
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
              <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: embedded ? '0.85rem' : { xs: '0.85rem', md: '1.1rem' }, fontWeight: 700, color: UI_COLORS.goldLight, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {C.name || 'Unnamed Character'}
              </Typography>
              {readOnly && (
                <Chip size="small" icon={<Eye size={11} />} label="READ ONLY"
                  sx={{ flexShrink: 0, height: 18, fontFamily: UI_FONTS.display, fontSize: '0.52rem', letterSpacing: '0.08em', color: UI_COLORS.blueLight, borderColor: uiAlpha(UI_COLORS.blueLight, 0.45), bgcolor: uiAlpha(UI_COLORS.blueLight, 0.08), '& .MuiChip-icon': { color: UI_COLORS.blueLight, ml: '4px' } }}
                  variant="outlined" />
              )}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[race, clsDisplay, bg].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>

        {/* XP and the actions: stacked on a phone, one row from a tablet up. */}
        <Box sx={{
          display: 'flex', alignItems: embedded ? 'stretch' : { xs: 'stretch', sm: 'center' },
          flexDirection: embedded ? 'column' : { xs: 'column', sm: 'row' },
          gap: embedded ? '0.4rem' : { xs: '0.4rem', sm: '1rem' },
          width: embedded ? '100%' : { xs: '100%', md: 'auto' },
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, width: embedded ? '100%' : { xs: '100%', sm: 'auto', md: 280, lg: 340 }, flex: embedded ? 'none' : { sm: 1, md: 'none' }, minWidth: 0, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%', gap: 1 }}>
              <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '0.62rem', color: UI_COLORS.goldLight, letterSpacing: '0.08em', fontWeight: 700 }}>
                XP · Level {level}
              </Typography>
              <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {isMaxLevel ? `${formatNumber(currentXp)} XP` : `${formatNumber(currentXp)} / ${formatNumber(nextXp)}`}
              </Typography>
            </Box>
            <Box sx={{ width: '100%', height: 8, bgcolor: UI_COLORS.surfaceRaised, borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
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

          <SheetActions
            readOnly={readOnly}
            embedded={embedded}
            rollCount={rollLog?.length || 0}
            onShortRest={onShortRest}
            onLongRest={onLongRest}
            onRoll={() => setCustomRollOpen(true)}
            onOpenLog={() => setRollLogOpen(true)}
          />
        </Box>
      </Box>
      </Box>

      <RollLogDialog
        open={rollLogOpen}
        onClose={() => setRollLogOpen(false)}
        rollLog={rollLog}
        onClear={onClearRollLog}
      />

      <CustomRollDialog
        open={customRollOpen}
        onClose={() => setCustomRollOpen(false)}
        onRoll={(formula) => {
          const { total, rolls } = rollFormulaDice(formula);
          onShowToast?.(formatRollTitle('Custom Roll', formula), formula, total, rolls);
        }}
      />
    </Box>
  );
}
