import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { Sparkles } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { EntryAccordion } from '../../../shared/content/EntryAccordion.jsx';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { activeClassCharacter, activeExtraClass } from '../state/activeClass.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';

function SubclassFeatureRow({ feature }) {
  return (
    <EntryAccordion
      title={feature.name}
      entries={feature.entries}
      tone={ENTITY_COLORS.subclass}
      leading={<MiniBadge label={`Lv ${feature.level}`} color={UI_COLORS.textSecondary} />}
    />
  );
}

export default function SubclassPanel({ character, dispatch }) {
  const tab = character.activeClassTab || 0;
  const isExtra = tab > 0;
  const extraIdx = tab - 1;
  const extra = activeExtraClass(character);
  const { cls, subclasses = [], allSubFeatures = [] } = activeClassCharacter(character);
  const subclassShortName = isExtra ? (extra?.subclassShortName || '') : (character.subclassShortName || '');
  const unlockLevel = cls?.subclassLevel || 3;
  const currentLevel = isExtra ? (extra?.level || 1) : primaryClassLevel(character);
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
                <Typography sx={{ color: 'text.secondary' }}>No subclass features loaded for this subclass.</Typography>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </BuilderPanel>
  );
}
