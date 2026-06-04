import { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, TextField, Button } from '@mui/material';
import { HeartPulse, Plus, Minus, Sparkles, Skull } from 'lucide-react';
import { EXHAUSTION_MAX } from '../logic/calculations.js';

export default function HPBlock({ sheet, onHeal, onDamage, onTempHP, onMaxHPBonus, onSetHP, onDeathSave }) {
  const [amountStr, setAmountStr] = useState('1');
  const [editingHP, setEditingHP] = useState(false);
  const [hpInput, setHpInput] = useState('');
  const hpRef = useRef(null);
  if (!sheet) return null;
  const dsSuccess = Math.max(0, Math.min(3, sheet.deathSaves.success || 0));
  const dsFail = Math.max(0, Math.min(3, sheet.deathSaves.fail || 0));
  const atZero = sheet.currentHP === 0;
  const dead = (sheet.exhaustionLevel || 0) >= EXHAUSTION_MAX;

  useEffect(() => {
    if (editingHP && hpRef.current) {
      hpRef.current.focus();
      hpRef.current.select();
    }
  }, [editingHP]);

  const hpColor = sheet.currentHP > sheet.maxHP / 2 ? '#58b879' : sheet.currentHP > 0 ? '#d69245' : '#c54a3f';

  return (
    <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.3rem 0.45rem' }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
        HP
      </Typography>
      {dead && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, my: 0.3, py: 0.2, border: 1, borderColor: '#e5484d', borderRadius: 1, bgcolor: 'rgba(229,72,77,0.12)' }}>
          <Skull size={12} style={{ color: '#e5484d' }} />
          <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e5484d' }}>
            Dead — Exhaustion {EXHAUSTION_MAX}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <IconButton size="small" onClick={() => onHeal(parseInt(amountStr) || 1)} sx={{ width: 24, height: 24, border: 1, borderColor: '#58b879', color: '#58b879', borderRadius: 1 }}>
          <Plus size={12} />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}>
          {editingHP ? (
            <TextField
              inputRef={hpRef}
              size="small" type="number" value={hpInput}
              onChange={e => setHpInput(e.target.value)}
              onBlur={() => { onSetHP(hpInput); setEditingHP(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onSetHP(hpInput); setEditingHP(false); } if (e.key === 'Escape') setEditingHP(false); }}
              slotProps={{ htmlInput: { min: 0, max: sheet.maxHP, style: { textAlign: 'center', padding: '2px 4px' } } }}
              sx={{ width: 60, '& input': { fontSize: '1.1rem', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, color: hpColor } }}
            />
          ) : (
            <Typography
              component="span" onClick={() => { setHpInput(String(sheet.currentHP)); setEditingHP(true); }}
              sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: hpColor, lineHeight: 1, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}>
              {sheet.currentHP}
            </Typography>
          )}
          <Typography component="span" sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.875rem', color: 'text.secondary' }}>/</Typography>
          <Typography component="span" sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.875rem', fontWeight: 600, color: 'text.secondary' }}>
            {sheet.maxHP}
          </Typography>
        </Box>
        <TextField
          size="small" type="number" value={amountStr}
          onChange={e => {
            const v = e.target.value;
            if (v === '' || /^-?\d*\.?\d*$/.test(v)) setAmountStr(v);
          }}
          slotProps={{ htmlInput: { min: 1, style: { textAlign: 'center' } } }}
          sx={{
            width: 68,
            '& input': { py: 0.25, fontSize: '0.75rem', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 600 },
            '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
            '& input[type=number]': { MozAppearance: 'textfield' },
          }}
        />
        <IconButton size="small" onClick={() => onDamage(parseInt(amountStr) || 1)} sx={{ width: 24, height: 24, border: 1, borderColor: '#de675f', color: '#de675f', borderRadius: 1 }}>
          <Minus size={12} />
        </IconButton>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '6px', alignItems: 'center', mt: 0.25 }}>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.15, whiteSpace: 'nowrap' }}>
          <Sparkles size={10} /> TEMP <Box component="b" sx={{ color: '#edd48a', fontWeight: 700, ml: 'auto' }}>{sheet.tempHP}</Box>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          <IconButton size="small" onClick={() => onTempHP(-1)} sx={{ width: 18, height: 18, border: 1, borderColor: 'divider', borderRadius: '4px', color: 'text.secondary' }}>-</IconButton>
          <IconButton size="small" onClick={() => onTempHP(1)} sx={{ width: 18, height: 18, border: 1, borderColor: 'divider', borderRadius: '4px', color: 'text.secondary' }}>+</IconButton>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '6px', alignItems: 'center', mt: 0.25 }}>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.15, whiteSpace: 'nowrap' }}>
          <HeartPulse size={10} /> MAX MOD <Box component="b" sx={{ color: '#edd48a', fontWeight: 700, ml: 'auto' }}>{sheet.maxHPBonus > 0 ? '+' : ''}{sheet.maxHPBonus}</Box>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          <IconButton size="small" onClick={() => onMaxHPBonus(-1)} sx={{ width: 18, height: 18, border: 1, borderColor: 'divider', borderRadius: '4px', color: 'text.secondary' }}>-</IconButton>
          <IconButton size="small" onClick={() => onMaxHPBonus(1)} sx={{ width: 18, height: 18, border: 1, borderColor: 'divider', borderRadius: '4px', color: 'text.secondary' }}>+</IconButton>
        </Box>
      </Box>
      {atZero && !dead && (
        <Box sx={{ mt: 0.25, pt: 0.25, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
              Death Saves
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
              {Array.from({ length: 3 }, (_, i) => (
                <Box key={`s${i}`} sx={{ width: 12, height: 12, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: i < dsSuccess ? '#58b879' : 'transparent' }} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
              {Array.from({ length: 3 }, (_, i) => (
                <Box key={`f${i}`} sx={{ width: 12, height: 12, borderRadius: '50%', border: 1, borderColor: 'divider', bgcolor: i < dsFail ? '#de675f' : 'transparent' }} />
              ))}
            </Box>
            <Button size="small" variant="outlined" onClick={onDeathSave}
              sx={{ ml: 'auto', minWidth: 36, height: 22, fontSize: '0.5rem', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 600, letterSpacing: '0.06em', color: 'text.secondary', borderColor: 'divider' }}>
              Roll
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
