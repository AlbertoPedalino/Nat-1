import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, Button, Tooltip } from '@mui/material';
import { HeartPulse, Sparkles, Skull } from 'lucide-react';
import HpStepper from '../../../shared/character/HpStepper.jsx';
import { EXHAUSTION_MAX } from '../logic/calculations.js';

const CINZEL = '"Cinzel", Georgia, serif';

const chipSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper',
  color: 'text.secondary',
  fontFamily: CINZEL,
  fontSize: '0.56rem',
  letterSpacing: '0.04em',
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
  const dsSuccess = Math.max(0, Math.min(3, sheet.deathSaves.success || 0));
  const dsFail = Math.max(0, Math.min(3, sheet.deathSaves.fail || 0));
  const atZero = sheet.currentHP === 0;
  const dead = (sheet.exhaustionLevel || 0) >= EXHAUSTION_MAX;
  const hpColor = sheet.currentHP > sheet.maxHP / 2 ? '#58b879' : sheet.currentHP > 0 ? '#d69245' : '#c54a3f';

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
      sx={{ ...sx, '& input': { fontFamily: CINZEL, fontWeight: 700, ...inputSx } }}
    />
  );

  const rowSx = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: '0.4rem', mt: 0.3 };

  return (
    <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.3rem 0.45rem' }}>
      <Typography sx={{ fontFamily: CINZEL, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
        HP
      </Typography>

      {dead && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, my: 0.3, py: 0.2, border: 1, borderColor: '#e5484d', borderRadius: 1, bgcolor: 'rgba(229,72,77,0.12)' }}>
          <Skull size={12} style={{ color: '#e5484d' }} />
          <Typography sx={{ fontFamily: CINZEL, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e5484d' }}>
            Dead — Exhaustion {EXHAUSTION_MAX}
          </Typography>
        </Box>
      )}

      {/* Current / Max HP */}
      <Box sx={rowSx}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', whiteSpace: 'nowrap', minWidth: 0 }}>
          {editing === 'hp' ? (
            editField({ width: 64 }, { fontSize: '1.4rem', color: hpColor })
          ) : (
            <Typography
              component="span"
              onClick={() => startEdit('hp', sheet.currentHP)}
              sx={{ fontFamily: CINZEL, fontSize: '1.5rem', fontWeight: 700, color: hpColor, lineHeight: 1, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
            >
              {sheet.currentHP}
            </Typography>
          )}
          <Typography component="span" sx={{ fontFamily: CINZEL, fontSize: '0.9rem', color: 'text.secondary' }}>/</Typography>
          <Typography component="span" sx={{ fontFamily: CINZEL, fontSize: '0.9rem', fontWeight: 600, color: 'text.secondary' }}>
            {sheet.maxHP}
          </Typography>
        </Box>
        <HpStepper
          variant="sheet"
          amount={hpAmt}
          onAmount={setHpAmt}
          onPlus={(n) => onHeal(n)}
          onMinus={(n) => onDamage(n)}
          plusColor="#58b879"
          minusColor="#de675f"
          plusLabel="Heal"
          minusLabel="Damage"
        />
      </Box>

      {/* Temp HP */}
      <Box sx={rowSx}>
        <Box sx={chipSx}>
          <Sparkles size={10} /> TEMP
          {editing === 'temp' ? (
            editField({ width: 40, ml: 'auto' }, { fontSize: '0.7rem', color: '#edd48a' })
          ) : (
            <Box
              component="b"
              onClick={() => startEdit('temp', sheet.tempHP)}
              sx={{ color: '#edd48a', fontWeight: 700, ml: 'auto', cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
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
            editField({ width: 44, ml: 'auto' }, { fontSize: '0.7rem', color: '#edd48a' })
          ) : (
            <Box
              component="b"
              onClick={() => startEdit('mod', sheet.maxHPBonus)}
              sx={{ color: '#edd48a', fontWeight: 700, ml: 'auto', cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
            >
              {sheet.maxHPBonus > 0 ? '+' : ''}{sheet.maxHPBonus}
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
            <Typography sx={{ fontFamily: CINZEL, fontSize: '0.56rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Death Saves
            </Typography>
            <Tooltip title="Click to set successes">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                {Array.from({ length: 3 }, (_, i) => (
                  <Box
                    key={`s${i}`}
                    onClick={() => onDeathSaveSet?.('success', dsSuccess === i + 1 ? i : i + 1)}
                    sx={{ width: 13, height: 13, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: i < dsSuccess ? '#58b879' : 'transparent', cursor: 'pointer', '&:hover': { borderColor: '#58b879' } }}
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
                    sx={{ width: 13, height: 13, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: i < dsFail ? '#de675f' : 'transparent', cursor: 'pointer', '&:hover': { borderColor: '#de675f' } }}
                  />
                ))}
              </Box>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              onClick={onDeathSave}
              sx={{ ml: 'auto', minWidth: 36, height: 22, fontSize: '0.5rem', fontFamily: CINZEL, fontWeight: 600, letterSpacing: '0.06em', color: 'text.secondary', borderColor: 'divider' }}
            >
              Roll
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
