import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { ChevronDown, Sparkles } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';
import { FullDescription } from './ExpandableDescription.jsx';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { ENTITY_COLORS, entityChipSx } from '../../../shared/entityColors.js';

function SubclassFeatureRow({ feature }) {
  return (
    <Accordion
      disableGutters
      square
      variant="outlined"
      sx={{
        minWidth: 0,
        bgcolor: 'transparent',
        backgroundImage: 'none',
        borderLeft: `3px solid ${ENTITY_COLORS.subclass}`,
        '&:before': { display: 'none' },
        '&.Mui-expanded': { my: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ChevronDown size={14} />}
        sx={{
          minHeight: 36,
          px: 1.25,
          py: 0,
          '&.Mui-expanded': { minHeight: 36 },
          '& .MuiAccordionSummary-content': { my: 0.6, minWidth: 0 },
          '& .MuiAccordionSummary-content.Mui-expanded': { my: 0.6 },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Chip size="small" label={`Lv ${feature.level}`} sx={entityChipSx('subclass')} />
          <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {feature.name}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.25, pt: 0, pb: 1 }}>
        <FullDescription entries={feature.entries} />
      </AccordionDetails>
    </Accordion>
  );
}

export default function SubclassPanel({ character, dispatch }) {
  const tab = character.activeClassTab || 0;
  const isExtra = tab > 0;
  const extraIdx = tab - 1;
  const extra = isExtra ? character.extraClasses[extraIdx] : null;
  const cls = isExtra ? extra?.cls : character.cls;
  const subclasses = isExtra ? (extra?.subclasses || []) : (character.subclasses || []);
  const allSubFeatures = isExtra ? (extra?.allSubFeatures || []) : (character.allSubFeatures || []);
  const subclassShortName = isExtra ? (extra?.subclassShortName || '') : (character.subclassShortName || '');
  const unlockLevel = cls?.subclassLevel || 3;
  const currentLevel = isExtra ? (extra?.level || 1) : getPrimaryClassLevel(character);
  if (!cls || !subclasses.length || currentLevel < unlockLevel) return null;
  const subclassFeatures = allSubFeatures.filter(
    (feature) => feature.subclassShortName === subclassShortName
      && !feature?.isReprinted
      && Number(feature?.level || 0) <= currentLevel,
  );
  const onChange = (value) => {
    if (isExtra) dispatch({ type: 'extra-subclass/select', index: extraIdx, subclassShortName: value });
    else dispatch({ type: 'subclass/select', subclassShortName: value });
  };
  return (
    <BuilderPanel id="panel-subclass" title={isExtra ? `Subclass — ${extra?.name || ''}` : 'Subclass'} icon={Sparkles} note={`Unlock level ${unlockLevel}`}>
      <Stack spacing={1.5}>
        <FormControl fullWidth size="small">
          <InputLabel>Subclass</InputLabel>
          <Select label="Subclass" value={subclassShortName} onChange={(event) => onChange(event.target.value)}>
            <MenuItem value="">None</MenuItem>
            {subclasses.map((subclass) => (
              <MenuItem key={`${subclass.shortName || subclass.name}-${subclass.source}`} value={subclass.shortName || subclass.name}>
                {subclass.name || subclass.shortName} ({subclass.source})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {subclassShortName ? (
          <Box sx={{ maxHeight: 450, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              {subclassFeatures.map((feature) => (
                <SubclassFeatureRow key={`${feature.name}-${feature.level}`} feature={feature} />
              ))}
              {!subclassFeatures.length ? (
                <Typography color="text.secondary">No subclass features loaded for this subclass.</Typography>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </BuilderPanel>
  );
}
