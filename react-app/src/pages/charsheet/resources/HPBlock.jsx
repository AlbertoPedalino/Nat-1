import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { HeartPulse, Sparkles, Skull } from 'lucide-react';
import HpStepper from '../../../shared/character/combat/HpStepper.jsx';
import DeathSaveDots from '../../../shared/character/combat/DeathSaveDots.jsx';
import { hpToneColor, normalizeDeathSaves } from '../../../shared/character/combat/vitals.js';
import { atDeathsDoor, clickedDeathSaveCount, resolveMortality } from '../../../shared/character/combat/mortality.js';
import { EXHAUSTION_MAX } from '../../../shared/character/combat/conditions.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { HP_TONE_COLORS, UI_COLORS, OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import { readoutSx } from '../../../shared/ui/interactive.js';
import CardSection from '../../../shared/ui/CardSection.jsx';

// When the panel fills its row (embedded sheet) the content follows the panel:
// 90% of it, never below the desktop column's 260px nor above 680px, never
// wider than the panel. The extra room goes between each value and its stepper.
const FILL_CONTENT_WIDTH = 'min(100%, clamp(260px, 90%, 680px))';
const FILL_COLUMN_GAP = 'clamp(0.4rem, 12%, 5rem)';

// The name of a value in the block (TEMP, MAX MOD): read, so flat; the value
// in it is what you click to type a new one.
const chipSx = {
  ...readoutSx(),
  color: 'text.secondary',
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xxs,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  px: 0.5,
  py: 0.25,
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
  const deathSaves = normalizeDeathSaves(sheet.deathSaves);
  // The same rules as the builder and the map: dead at 0 HP with three failed
  // saves or the Dead condition — or, on a sheet, at the last exhaustion level.
  const exhausted = (sheet.exhaustionLevel || 0) >= EXHAUSTION_MAX;
  const dead = exhausted || resolveMortality({
    player: true, hp: sheet.currentHP, deathSaves, conditions: sheet.activeConditions,
  }).dead;
  // A dead character's saves can still be corrected; only exhaustion is final.
  const showDeathSaves = atDeathsDoor({ player: true, hp: sheet.currentHP }) && !exhausted;
  const hpColor = hpToneColor(sheet.currentHP, sheet.maxHP, HP_TONE_COLORS);

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
      sx={{ ...sx, '& input': { ...TEXT_STYLES.figure, ...inputSx } }}
    />
  );

  const rowSx = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: fillWidth ? FILL_COLUMN_GAP : '0.4rem', mt: 0.25 };

  return (
    <Panel icon={GAME_ICONS.hitPoints} title="Hit Points" tone={PANEL_TONES.hitPoints} sx={{ width: fillWidth ? '100%' : { xs: '100%', md: 260 }, flexShrink: 0 }} bodySx={{}}>
      <Box sx={{ width: fillWidth ? FILL_CONTENT_WIDTH : undefined, mx: 'auto', p: '0.3rem 0.45rem' }}>

        {dead && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, my: 0.25, py: 0.25, border: 2, borderColor: UI_COLORS.dangerStrong, borderRadius: 1, ...tintedSurfaceSx(UI_COLORS.dangerStrong) }}>
            <Skull size={ICON_SIZES.xs} style={{ color: UI_COLORS.dangerStrong }} />
            <Typography sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xs, color: UI_COLORS.dangerStrong }}>
              {exhausted ? `Dead — Exhaustion ${EXHAUSTION_MAX}` : 'Dead'}
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
                sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.heading, color: hpColor, lineHeight: LINE_HEIGHTS.none, cursor: 'pointer', '&:hover': { opacity: OPACITY.heavy } }}
              >
                {sheet.currentHP}
              </Typography>
            )}
            <Typography component="span" sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxl, color: 'text.secondary' }}>/</Typography>
            <Typography component="span" sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxl, color: 'text.secondary' }}>
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
            <Sparkles size={ICON_SIZES.xxs} /> TEMP
            {editing === 'temp' ? (
              editField({ width: 40, ml: 'auto' }, { fontSize: FONT_SIZES.md, color: UI_COLORS.accentText })
            ) : (
              <Box
                component="b"
                onClick={() => startEdit('temp', sheet.tempHP)}
                sx={{ color: UI_COLORS.accentText, fontWeight: FONT_WEIGHTS.bold, ml: 'auto', cursor: 'pointer', '&:hover': { opacity: OPACITY.heavy } }}
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
            <HeartPulse size={ICON_SIZES.xxs} /> MAX MOD
            {editing === 'mod' ? (
              editField({ width: 44, ml: 'auto' }, { fontSize: FONT_SIZES.md, color: UI_COLORS.accentText })
            ) : (
              <Box
                component="b"
                onClick={() => startEdit('mod', sheet.maxHPBonus)}
                sx={{ color: UI_COLORS.accentText, fontWeight: FONT_WEIGHTS.bold, ml: 'auto', cursor: 'pointer', '&:hover': { opacity: OPACITY.heavy } }}
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

        {showDeathSaves && (
          <CardSection dense sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xxs, color: 'text.secondary' }}>
              Death Saves
            </Typography>
            <DeathSaveDots
              deathSaves={deathSaves}
              colors={{ success: UI_COLORS.success, fail: UI_COLORS.danger }}
              onChange={(type, value) => onDeathSaveSet?.(type, clickedDeathSaveCount(deathSaves[type], value))}
            />
            {!dead && (
            <Button
              size="small"
              variant="outlined"
              onClick={onDeathSave}
              sx={{ ml: 'auto', minWidth: 36, height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xxxs, ...TEXT_STYLES.title, color: 'text.secondary', borderColor: 'divider' }}
            >
              Roll
            </Button>
            )}
          </CardSection>
        )}
      </Box>
    </Panel>
  );
}
