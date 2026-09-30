import { useState } from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { ChevronDown, ListChecks, X } from 'lucide-react';
import { effectId, normalizeEffects } from '../../../shared/character/combat/combatEffects.js';
import { EffectEditor, EffectPill } from '../../../shared/character/combat/EffectChips.jsx';

// Advantage / disadvantage on the character's rolls, beside Conditions and
// framed the same way: active pills always shown, the assignment grid behind
// "Manage". The list is the same one the battle-map piece and the encounter
// combatant show, and the sheet's own dice honour it. Every effect stays until
// someone removes it; the duration on a pill is a reminder, not a timer.
export default function EffectsBlock({ sheet, actions }) {
  const [open, setOpen] = useState(false);
  const active = normalizeEffects(sheet.activeEffects);

  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.4rem 0.62rem', mt: '0.4rem' }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'primary.main', mb: 0.4 }}>
        Advantage / Disadvantage
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
          {active.length === 0 && <Chip size="small" label="— None" variant="outlined" sx={{ fontSize: '0.5rem', borderStyle: 'dashed' }} />}
          {active.map((effect) => (
            <EffectPill
              key={effectId(effect)}
              effect={effect}
              fontSize="0.5rem"
              onRetime={(duration) => actions.retime(effectId(effect), duration)}
              onRemove={() => actions.remove(effectId(effect))}
            />
          ))}
        </Box>

        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: '3px 6px' }}>
          <Box
            component="button"
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            sx={{ width: '100%', bgcolor: 'transparent', border: 0, p: '2px 3px', borderRadius: '3px', cursor: 'pointer', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', color: 'text.secondary', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 0.5, userSelect: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: 'text.primary' } }}
          >
            <ListChecks size={12} /> Manage ({active.length})
            <ChevronDown size={12} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </Box>
          {open && (
            <Box>
              <EffectEditor effects={active} onToggle={actions.toggle} onAddCustom={actions.addCustom} />
              {active.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<X size={12} />}
                  onClick={actions.clear}
                  sx={{ mt: 0.6, fontSize: '0.5rem', py: 0.1, lineHeight: 1.4, color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: '#a04848', color: '#a04848', bgcolor: 'rgba(160,72,72,0.08)' } }}
                >
                  Clear all
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
