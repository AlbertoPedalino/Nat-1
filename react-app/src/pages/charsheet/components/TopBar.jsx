import { useRef, useState } from 'react';
import { Box, Typography, Button, Chip, Menu, MenuItem } from '@mui/material';
import { ArrowLeft, Home, Sun, Moon, Wand2, Hammer, Axe, Music, Cross, Feather, Sword, Dumbbell, Shield, Compass, Eye, Sparkles, Flame, BookOpen, Dices, Trash2, ImagePlus, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { levelFromXp, xpForLevel, xpProgressPct, MAX_LEVEL } from '../../../shared/character/xp.js';
import { rollFormula as rollFormulaDice, formatRollTitle } from '../../../shared/character/dice.js';
import IconColorPicker from '../../../shared/character/IconColorPicker.jsx';
import PortraitBadge from '../../../shared/character/PortraitBadge.jsx';
import { deletePortrait, uploadPortrait } from '../../../shared/cloud/characterArt.js';
import SheetDialog from '../../../shared/character/SheetDialog.jsx';
import XpDeltaControl from '../../../shared/character/XpDeltaControl.jsx';
import CloudMenu from '../../../shared/cloud/CloudMenu.jsx';
import { primaryClassLevel } from '../../../shared/character/classLevel.js';
import CustomRollDialog from '../../../shared/character/CustomRollDialog.jsx';

const CLASS_ICONS = {
  Artificer: Hammer,
  Barbarian: Axe,
  Bard: Music,
  Cleric: Cross,
  Druid: Feather,
  Fighter: Sword,
  Monk: Dumbbell,
  Paladin: Shield,
  Ranger: Compass,
  Rogue: Eye,
  Sorcerer: Sparkles,
  Warlock: Flame,
  Wizard: BookOpen,
};

function classIcon(className) {
  return CLASS_ICONS[className] || Wand2;
}

function formatRollValues(rolls) {
  if (!rolls?.length) return '';
  return rolls.map((r) => {
    let text = String(r.v);
    if (r.faces) text += ` (d${r.faces})`;
    return text;
  }).join(', ');
}

function formatMod(mod) {
  if (mod == null) return '';
  return mod >= 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`;
}

function cleanFormula(detail) {
  if (!detail) return '';
  return detail.replace(/\s*=\s*\d+$/, '');
}

function splitLabel(label, detail) {
  const result = { clean: label || '', suffix: '' };
  if (!label || !detail) return result;
  const cleaned = cleanFormula(detail);
  if (!cleaned) return result;
  const idx = label.toLowerCase().lastIndexOf(cleaned.toLowerCase());
  if (idx >= 0) {
    result.clean = label.slice(0, idx).replace(/[\s\-–—]+$/, '');
    result.suffix = label.slice(idx).trim();
  }
  return result;
}

function modFromDice(rolls, total) {
  if (!rolls?.length) return null;
  const diceSum = rolls.reduce((s, r) => s + (r.v || 0), 0);
  return total - diceSum;
}

const ROLL_LOG_SX = {
  entry: {
    border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.5, mb: 0.4,
    bgcolor: 'rgba(35,32,26,0.6)',
  },
  label: { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.7rem', color: '#edd48a', fontWeight: 700, letterSpacing: '0.04em', mb: 0.15 },
  formula: { fontSize: '0.6rem', color: 'text.secondary', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.2 },
  rollBreakdown: { fontSize: '0.58rem', color: '#70b7a6', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.2, my: 0 },
  total: { fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.1rem', color: 'primary.main', fontWeight: 700, flexShrink: 0, pl: 0.5, lineHeight: 1, my: 0 },
  empty: { fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', py: 3 },
};

const appNavButtonSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
};

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
      <Box sx={{ maxWidth: embedded ? 'none' : 1280, mx: embedded ? 0 : { md: 'auto' }, px: embedded ? '0.45rem' : { xs: '0.6rem', md: '1.1rem' } }}>
      {!embedded ? (
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.35rem',
          py: '0.35rem',
          borderBottom: 1,
          borderColor: 'rgba(237,212,138,0.14)',
        }}>
          <Box sx={{ display: 'flex', gap: '0.35rem' }}>
            <Button size="small" variant="outlined" color="primary" startIcon={<Home size={14} />}
              onClick={() => navigate('/')} sx={appNavButtonSx}>
              HOME
            </Button>
            {!readOnly && (
              <Button size="small" variant="outlined" color="primary" startIcon={<ArrowLeft size={14} />}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  // Use the sheet's own id first: the online sheet route is
                  // /campaign-sheet?id=…, so params.get('char') is null there and we
                  // must not fall back to a stale gb:active_char (would open a blank
                  // or wrong builder). C.id covers chars whose id lives in the data.
                  const targetId = charId || C?.id
                    || params.get('char') || params.get('id')
                    || localStorage.getItem('gb:active_char') || 'new';
                  navigate(`/charbuilder?char=${encodeURIComponent(targetId)}`);
                }}
                sx={appNavButtonSx}>
                Builder
              </Button>
            )}
          </Box>
          <Box sx={{
            display: 'flex', gap: '0.35rem', flexShrink: 0,
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-end', md: 'center' },
          }}>
            <CloudMenu buttonSx={appNavButtonSx} />
          </Box>
        </Box>
      ) : null}
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
              ...(readOnly ? {} : { '&:hover': { borderColor: '#caa550' } }),
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
              <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: embedded ? '0.85rem' : { xs: '0.85rem', md: '1.1rem' }, fontWeight: 700, color: '#edd48a', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {C.name || 'Unnamed Character'}
              </Typography>
              {readOnly && (
                <Chip size="small" icon={<Eye size={11} />} label="READ ONLY"
                  sx={{ flexShrink: 0, height: 18, fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.52rem', letterSpacing: '0.08em', color: '#9ec5e6', borderColor: 'rgba(158,197,230,0.45)', bgcolor: 'rgba(158,197,230,0.08)', '& .MuiChip-icon': { color: '#9ec5e6', ml: '4px' } }}
                  variant="outlined" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[race, clsDisplay, bg].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, width: embedded ? '100%' : { xs: '100%', md: 280, lg: 340 }, flexShrink: 0, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%', gap: 1 }}>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.62rem', color: '#edd48a', letterSpacing: '0.08em', fontWeight: 700 }}>
              XP · Level {level}
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {isMaxLevel ? `${currentXp.toLocaleString()} XP` : `${currentXp.toLocaleString()} / ${nextXp.toLocaleString()}`}
            </Typography>
          </Box>
          <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(46,42,34,1)', borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
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

        <Box sx={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', width: embedded ? '100%' : { xs: '100%', md: 'auto' }, justifyContent: embedded ? 'center' : { xs: 'center', md: 'flex-start' } }}>
          {!readOnly && (
            <>
              <Button size="small" variant="outlined" color="warning" startIcon={<Sun size={14} />}
                onClick={onShortRest} sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em' }}>
                SHORT REST
              </Button>
              <Button size="small" variant="outlined" color="info" startIcon={<Moon size={14} />}
                onClick={onLongRest} sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em' }}>
                LONG REST
              </Button>
            </>
          )}
          <Button size="small" variant="outlined" startIcon={<Dices size={14} />}
            onClick={() => setCustomRollOpen(true)}
            sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em', color: '#edd48a', borderColor: 'rgba(237,212,138,0.4)' }}>
            ROLL
          </Button>
          <Button size="small" variant="outlined" startIcon={<Dices size={14} />}
            onClick={() => setRollLogOpen(true)}
            sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em', color: '#58b879', borderColor: 'rgba(88,184,121,0.4)' }}>
            LOG ({rollLog?.length || 0})
          </Button>
      </Box>
      </Box>
      </Box>

      <SheetDialog
        open={rollLogOpen}
        onClose={() => setRollLogOpen(false)}
        maxWidth="sm"
        title="Roll Log"
        icon={<Dices size={20} />}
        headerRight={rollLog?.length > 0 ? (
          <Button size="small" variant="text" startIcon={<Trash2 size={12} />}
            onClick={() => { onClearRollLog?.(); }}
            sx={{ fontSize: '0.6rem', color: 'text.secondary', minWidth: 0, p: 0.3 }}>
            Clear
          </Button>
        ) : null}
        actions={(
          <Button onClick={() => setRollLogOpen(false)} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>
            Close
          </Button>
        )}
      >
        {!rollLog?.length ? (
            <Typography sx={ROLL_LOG_SX.empty}>No rolls yet. Make an ability check, save, or attack to see it here.</Typography>
          ) : (
            rollLog.slice(0, 50).map((entry, i) => {
              const formulaText = cleanFormula(entry.detail);
              const diceText = formatRollValues(entry.rolls);
              const bonus = entry.meta?.bonus != null ? entry.meta.bonus : modFromDice(entry.rolls, entry.total);
              const labelParts = splitLabel(entry.label, formulaText);
              const extra = labelParts.suffix
                ? labelParts.suffix.replace(formulaText, '').trim()
                : '';
              const suffixStr = extra ? ` ${extra}` : '';
              const breakdownText = diceText && bonus != null
                ? `${diceText}${bonus !== 0 ? formatMod(bonus) : ''} = ${entry.total}`
                : '';
              const d20s = (entry.rolls || []).filter((r) => r.faces === 20);
              const keptD20 = d20s.find((r) => r.kept) || d20s[0];
              const isCrit = keptD20?.v >= 20;
              const isFail = keptD20?.v <= 1;
              const mode = entry.meta?.mode;
              const modeLabel = mode === 'advantage' ? 'ADV' : mode === 'disadvantage' ? 'DIS' : null;
              const modeColor = mode === 'advantage' ? '#58b879' : mode === 'disadvantage' ? '#d69245' : null;
              return (
              <Box key={entry.timestamp + '-' + i} sx={{
                ...ROLL_LOG_SX.entry, display: 'flex', gap: 0.5,
                ...(isCrit ? { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' } : {}),
                ...(isFail ? { borderColor: '#de675f', bgcolor: 'rgba(222,103,95,0.06)' } : {}),
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.15 }}>
                    <Typography sx={{ ...ROLL_LOG_SX.label, mb: 0 }}>{labelParts.clean}</Typography>
                    {modeLabel && (
                      <Box component="span" sx={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', color: modeColor, border: 1, borderColor: modeColor, borderRadius: 0.5, px: 0.4, py: 0.1, lineHeight: 1.2 }}>
                        {modeLabel}
                      </Box>
                    )}
                  </Box>
                  {(isCrit || isFail) && (
                    <Typography sx={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.08em', color: isCrit ? '#edd48a' : '#de675f', fontFamily: '"Cinzel", Georgia, serif', mb: 0.15 }}>
                      {isCrit ? 'NATURAL 20!' : 'NATURAL 1'}
                    </Typography>
                  )}
                  <Typography sx={ROLL_LOG_SX.formula}>{formulaText}{suffixStr}</Typography>
                  {breakdownText ? (
                    <Typography sx={ROLL_LOG_SX.rollBreakdown}>{breakdownText}</Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, pr: 0.5 }}>
                  <Typography sx={{
                    ...ROLL_LOG_SX.total,
                    ...(isCrit ? { color: '#edd48a', fontSize: '1.3rem' } : {}),
                    ...(isFail ? { color: '#de675f', fontSize: '1.3rem' } : {}),
                  }}>
                    {entry.total}
                  </Typography>
                </Box>
              </Box>
              );
            })
          )}
      </SheetDialog>

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

