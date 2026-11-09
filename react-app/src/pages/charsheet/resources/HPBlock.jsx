import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Button, Tooltip } from '@mui/material';
import { HeartPulse, Sparkles, Skull } from 'lucide-react';
import HpStepper from '../../../shared/character/combat/HpStepper.jsx';
import { normalizeDeathSaves } from '../../../shared/character/combat/vitals.js';
import { EXHAUSTION_MAX } from '../../../shared/character/sheet/sheetStats.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { sheetBoxSx } from '../../../shared/ui/PanelHeader.jsx';

// When the panel fills its row (embedded sheet) the content follows the panel:
// 90% of it, never below the desktop column's 260px nor above 680px, never
// wider than the panel. The extra room goes between each value and its stepper.
const FILL_CONTENT_WIDTH = 'min(100%, clamp(260px, 90%, 680px))';
const FILL_COLUMN_GAP = 'clamp(0.4rem, 12%, 5rem)';

const chipSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  color: 'text.secondary',
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xxs,
  letterSpacing: LETTER_SPACINGS.sm,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  px: 0.5,
  py: 0.15,
  whiteSpace: 'nowrap',
};

export default function HPBlock({
  sheet,
  onHeal,
  onDamage,
  onTempHP,
  onMaxHPBonus,
  onSetHP,
  onSetTempHP,
  onSetMaxHPBonus,
  onDeathSave,
  onDeathSaveSet,
  fillWidth = false,
}) {
  const [hpAmt, setHpAmt] = useState('1');
  const [tempAmt, setTempAmt] = useState('1');
  const [modAmt, setModAmt] = useState('1');
  const [editing, setEditing] = useState(null); // 'hp' | 'temp' | 'mod' | null
  const [editVal, setEditVal] = useState('');
  const editRef = useRef(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editing]);

  if (!sheet) return null;
  const { success: dsSuccess, fail: dsFail } = normalizeDeathSaves(sheet.deathSaves);
  const atZero = sheet.currentHP === 0;
  const dead = (sheet.exhaustionLevel || 0) >= EXHAUSTION_MAX;
  const hpColor = sheet.currentHP > sheet.maxHP / 2 ? UI_COLORS.success : sheet.currentHP > 0 ? UI_COLORS.warning : UI_COLORS.dangerHp;

  const startEdit = (key, current) => {
    setEditVal(String(current));
    setEditing(key);
  };
  const commitEdit = () => {
    if (editing === 'hp') onSetHP(editVal);
    else if (editing === 'temp') onSetTempHP(editVal);
    else if (editing === 'mod') onSetMaxHPBonus(editVal);
    setEditing(null);
  };
  const onEditKey = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  // Inline edit field shared by all three values. `inputSx` merges into the
  // base input style (font stays Cinzel/bold across every row).
  const editField = (sx, inputSx) => (
    <TextField
      inputRef={editRef}
      size="small"
      value={editVal}
      onChange={(e) => setEditVal(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commitEdit}
      onKeyDown={onEditKey}
      slotProps={{ htmlInput: { inputMode: 'numeric', style: { textAlign: 'center', padding: '1px 3px' } } }}
      sx={{ ...sx, '& input': { fontFamily: UI_FONTS.display, fontWeight: 700, ...inputSx } }}
    />
  );

  const rowSx = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: fillWidth ? FILL_COLUMN_GAP : '0.4rem', mt: 0.3 };

  return (
    <Box sx={{ ...sheetBoxSx, width: fillWidth ? '100%' : { xs: '100%', md: 260 }, flexShrink: 0 }}>
      <Box sx={{ width: fillWidth ? FILL_CONTENT_WIDTH : undefined, mx: 'auto', p: '0.3rem 0.45rem' }}>
        <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxxs, fontWeight: 600, letterSpacing: LETTER_SPACINGS.xxl, textTransform: 'uppercase', color: 'text.secondary' }}>
          HP
        </Typography>

        {dead && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, my: 0.3, py: 0.2, border: 1, borderColor: UI_COLORS.dangerBright, borderRadius: 1, bgcolor: uiAlpha(UI_COLORS.dangerBright, 0.12) }}>
            <Skull size={12} style={{ color: UI_COLORS.dangerBright }} />
            <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xs, fontWeight: 700, letterSpacing: LETTER_SPACINGS.lg, textTransform: 'uppercase', color: UI_COLORS.dangerBright }}>
              Dead — Exhaustion {EXHAUSTION_MAX}
            </Typography>
          </Box>
        )}

        {/* Current / Max HP */}
        <Box sx={rowSx}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', whiteSpace: 'nowrap', minWidth: 0 }}>
            {editing === 'hp' ? (
              editField({ width: 64 }, { fontSize: FONT_SIZES.heading, color: hpColor })
            ) : (
              <Typography
                component="span"
                onClick={() => startEdit('hp', sheet.currentHP)}
                sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.heading, fontWeight: 700, color: hpColor, lineHeight: 1, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
              >
                {sheet.currentHP}
              </Typography>
            )}
            <Typography component="span" sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxl, color: 'text.secondary' }}>/</Typography>
            <Typography component="span" sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxl, fontWeight: 600, color: 'text.secondary' }}>
              {sheet.maxHP}
            </Typography>
          </Box>
          <HpStepper
            variant="sheet"
            amount={hpAmt}
            onAmount={setHpAmt}
            onPlus={(n) => onHeal(n)}
            onMinus={(n) => onDamage(n)}
            plusColor={UI_COLORS.success}
            minusColor={UI_COLORS.danger}
            plusLabel="Heal"
            minusLabel="Damage"
          />
        </Box>

        {/* Temp HP */}
        <Box sx={rowSx}>
          <Box sx={chipSx}>
            <Sparkles size={10} /> TEMP
            {editing === 'temp' ? (
              editField({ width: 40, ml: 'auto' }, { fontSize: FONT_SIZES.md, color: UI_COLORS.goldLight })
            ) : (
              <Box
                component="b"
                onClick={() => startEdit('temp', sheet.tempHP)}
                sx={{ color: UI_COLORS.goldLight, fontWeight: 700, ml: 'auto', cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
              >
                {sheet.tempHP}
              </Box>
            )}
          </Box>
          <HpStepper
            variant="sheet"
            amount={tempAmt}
            onAmount={setTempAmt}
            onPlus={(n) => onTempHP(n)}
            onMinus={(n) => onTempHP(-n)}
            plusLabel="Add temp HP"
            minusLabel="Remove temp HP"
          />
        </Box>

        {/* Max HP modifier */}
        <Box sx={rowSx}>
          <Box sx={chipSx}>
            <HeartPulse size={10} /> MAX MOD
            {editing === 'mod' ? (
              editField({ width: 44, ml: 'auto' }, { fontSize: FONT_SIZES.md, color: UI_COLORS.goldLight })
            ) : (
              <Box
                component="b"
                onClick={() => startEdit('mod', sheet.maxHPBonus)}
                sx={{ color: UI_COLORS.goldLight, fontWeight: 700, ml: 'auto', cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
              >
                {signed(sheet.maxHPBonus)}
              </Box>
            )}
          </Box>
          <HpStepper
            variant="sheet"
            amount={modAmt}
            onAmount={setModAmt}
            onPlus={(n) => onMaxHPBonus(n)}
            onMinus={(n) => onMaxHPBonus(-n)}
            plusLabel="Increase max HP modifier"
            minusLabel="Decrease max HP modifier"
          />
        </Box>

        {atZero && !dead && (
          <Box sx={{ mt: 0.25, pt: 0.25, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs, letterSpacing: LETTER_SPACINGS.md, textTransform: 'uppercase', color: 'text.secondary' }}>
                Death Saves
              </Typography>
              <Tooltip title="Click to set successes">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Box
                      key={`s${i}`}
                      onClick={() => onDeathSaveSet?.('success', dsSuccess === i + 1 ? i : i + 1)}
                      sx={{ width: 13, height: 13, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: i < dsSuccess ? UI_COLORS.success : 'transparent', cursor: 'pointer', '&:hover': { borderColor: UI_COLORS.success } }}
                    />
                  ))}
                </Box>
              </Tooltip>
              <Tooltip title="Click to set failures">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Box
                      key={`f${i}`}
                      onClick={() => onDeathSaveSet?.('fail', dsFail === i + 1 ? i : i + 1)}
                      sx={{ width: 13, height: 13, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: i < dsFail ? UI_COLORS.danger : 'transparent', cursor: 'pointer', '&:hover': { borderColor: UI_COLORS.danger } }}
                    />
                  ))}
                </Box>
              </Tooltip>
              <Button
                size="small"
                variant="outlined"
                onClick={onDeathSave}
                sx={{ ml: 'auto', minWidth: 36, height: 22, fontSize: FONT_SIZES.xxxs, fontFamily: UI_FONTS.display, fontWeight: 600, letterSpacing: LETTER_SPACINGS.md, color: 'text.secondary', borderColor: 'divider' }}
              >
                Roll
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
