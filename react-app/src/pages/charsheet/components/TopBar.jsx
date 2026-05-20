import { useState } from 'react';
import { Box, Stack, Typography, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Chip } from '@mui/material';
import { ArrowLeft, Home, Sun, Moon, Download, Wand2, Hammer, Axe, Music, Cross, Feather, Sword, Dumbbell, Shield, Compass, Eye, Sparkles, Flame, BookOpen, Dices, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLevelFromXp, getXpForNextLevel } from '../logic/calculations.js';
import IconColorPicker from '../../../shared/character/IconColorPicker.jsx';

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

function normalizeXpInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '') || '0';
}

const ROLL_LOG_SX = {
  dialogPaper: {
    sx: { bgcolor: 'rgba(26,23,19,0.98)', border: 1, borderColor: 'divider', borderRadius: 1, backgroundImage: 'none', boxShadow: '0 18px 52px rgba(0,0,0,0.62)' },
  },
  title: {
    fontFamily: '"Cinzel", Georgia, serif', color: '#edd48a', bgcolor: 'rgba(35,32,26,1)', borderBottom: 1, borderColor: 'divider', fontSize: '0.85rem', letterSpacing: '0.06em',
  },
  content: { bgcolor: 'rgba(26,23,19,0.98)', pt: 1.25 },
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

export default function TopBar({ C, sheet, onShortRest, onLongRest, onDownload, onUpdateXp, onUpdateCharacter, rollLog, onClearRollLog }) {
  const [colorAnchor, setColorAnchor] = useState(null);
  const [rollLogOpen, setRollLogOpen] = useState(false);
  const navigate = useNavigate();
  const extra = C.extraClasses || [];
  const pLv = C.classLevel || C.level;
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

  const currentLevel = getLevelFromXp(sheet.xpStored);
  const currentXp = sheet.xpStored;
  const nextXp = getXpForNextLevel(currentLevel + 1);
  const prevXp = getXpForNextLevel(currentLevel);
  const xpInLevel = nextXp - prevXp;
  const xpProgress = xpInLevel > 0 ? ((currentXp - prevXp) / xpInLevel) * 100 : 0;

  return (
    <Box sx={{
      bgcolor: 'background.paper', borderBottom: 2, borderColor: 'divider',
    }}>
      <Box sx={{ maxWidth: 1280, mx: { md: 'auto' }, px: { xs: '0.6rem', md: '1.1rem' } }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        gap: '0.35rem',
        py: '0.35rem',
        borderBottom: 1,
        borderColor: 'rgba(237,212,138,0.14)',
      }}>
        <Button size="small" variant="outlined" color="primary" startIcon={<Home size={14} />}
          onClick={() => navigate('/')} sx={appNavButtonSx}>
          HOME
        </Button>
        <Button size="small" variant="outlined" color="primary" startIcon={<ArrowLeft size={14} />}
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            const charId = params.get('char') || localStorage.getItem('gb:active_char') || 'new';
            navigate(`/charbuilder?char=${encodeURIComponent(charId)}`);
          }}
          sx={appNavButtonSx}>
          Builder
        </Button>
      </Box>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: { xs: '0.4rem', md: '1rem' },
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: { md: 'space-between' },
        py: { xs: '0.35rem', md: '0.6rem' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: { xs: '100%', md: 'auto' } }}>
          <Box
            onClick={(e) => setColorAnchor(e.currentTarget)}
            sx={{
              width: { xs: 36, md: 52 }, height: { xs: 36, md: 52 },
              borderRadius: '50%', border: 2, borderColor: 'divider', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              bgcolor: C.classIconColor || 'rgba(46,42,34,1)', fontSize: { xs: '1rem', md: '1.4rem' },
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: '#caa550' },
            }}
          >
            <Icon size={25} />
          </Box>
          <IconColorPicker
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            currentColor={C.classIconColor}
            onSelect={(color) => onUpdateCharacter?.(prev => ({ ...prev, classIconColor: color }))}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: { xs: '0.85rem', md: '1.1rem' }, fontWeight: 700, color: '#edd48a', letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {C.name || 'Unnamed Character'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[race, clsDisplay, bg].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, width: { xs: '100%', md: 280, lg: 340 }, flexShrink: 0, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%', gap: 1 }}>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.62rem', color: '#edd48a', letterSpacing: '0.08em', fontWeight: 700 }}>
              XP
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {currentXp} / {nextXp}
            </Typography>
          </Box>
          <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(46,42,34,1)', borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', bgcolor: 'primary.main', borderRadius: 1, transition: 'width 0.4s', width: `${Math.min(100, xpProgress)}%` }} />
          </Box>
          <TextField
            size="small"
            type="text"
            value={String(sheet.xpStored ?? 0)}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => onUpdateXp(normalizeXpInput(event.target.value))}
            sx={{ width: { xs: '100%', md: 132 }, '& input': { textAlign: 'center', fontSize: '0.75rem', py: 0.5, color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 600 } }}
            slotProps={{ input: { inputMode: 'numeric', sx: { '& fieldset': { borderColor: 'transparent', borderBottom: '1px solid', borderBottomColor: 'primary.main' } } } }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'center', md: 'flex-start' } }}>
          <Button size="small" variant="outlined" color="warning" startIcon={<Sun size={14} />}
            onClick={onShortRest} sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em' }}>
            SHORT REST
          </Button>
          <Button size="small" variant="outlined" color="info" startIcon={<Moon size={14} />}
            onClick={onLongRest} sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em' }}>
            LONG REST
          </Button>
          <Button size="small" variant="outlined" startIcon={<Dices size={14} />}
            onClick={() => setRollLogOpen(true)}
            sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em', color: '#58b879', borderColor: 'rgba(88,184,121,0.4)' }}>
            LOG ({rollLog?.length || 0})
          </Button>
          <Button size="small" variant="outlined" color="secondary" startIcon={<Download size={14} />}
            onClick={onDownload} sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', letterSpacing: '0.08em' }}>
            DOWNLOAD
          </Button>
      </Box>
      </Box>
      </Box>

      <Dialog open={rollLogOpen} onClose={() => setRollLogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: ROLL_LOG_SX.dialogPaper }}>
        <DialogTitle sx={ROLL_LOG_SX.title}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Roll Log
            {rollLog?.length > 0 && (
              <Button size="small" variant="text" startIcon={<Trash2 size={12} />}
                onClick={() => { onClearRollLog?.(); }}
                sx={{ fontSize: '0.55rem', color: 'text.secondary', minWidth: 0, p: 0.3 }}>
                Clear
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={ROLL_LOG_SX.content}>
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
              return (
              <Box key={entry.timestamp + '-' + i} sx={{ ...ROLL_LOG_SX.entry, display: 'flex', gap: 0.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={ROLL_LOG_SX.label}>{labelParts.clean}</Typography>
                  <Typography sx={ROLL_LOG_SX.formula}>{formulaText}{suffixStr}</Typography>
                  {breakdownText ? (
                    <Typography sx={ROLL_LOG_SX.rollBreakdown}>{breakdownText}</Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, pr: 0.5 }}>
                  <Typography sx={ROLL_LOG_SX.total}>
                    <Box component="span" sx={{ fontSize: '0.68rem', color: '#edd48a', fontWeight: 500, mr: 0.35 }}>Result = </Box>
                    {entry.total}
                  </Typography>
                </Box>
              </Box>
              );
            })
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'rgba(35,32,26,1)', borderTop: 1, borderColor: 'divider', px: 2, py: 1 }}>
          <Button onClick={() => setRollLogOpen(false)} variant="outlined" size="small" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
