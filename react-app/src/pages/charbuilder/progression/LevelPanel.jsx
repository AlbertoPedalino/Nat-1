import { Chip, Grid, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { HeartPulse } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { getPrimaryClassLevel } from './calculations.js';
import { getProficiencyBonus } from '../../../shared/character/progression/proficiency.js';
import { computeMaxHp, hitDieFaces } from '../../../shared/character/combat/hp.js';
import { multiclassLevels } from '../../../shared/character/progression/classLevel.js';

export default function LevelPanel({ character, dispatch }) {
  const tab = character.activeClassTab || 0;
  const isExtra = tab > 0;
  const extraIdx = tab - 1;
  const extraClass = isExtra ? character.extraClasses[extraIdx] : null;
  const cls = isExtra ? extraClass?.cls : character.cls;
  const hp = computeMaxHp(character);
  const faces = cls ? `d${hitDieFaces(cls)}` : '?';
  const selectedExtraLevels = multiclassLevels(character.extraClasses);
  const otherExtra = multiclassLevels(character.extraClasses, { except: extraIdx });
  const primaryLv = getPrimaryClassLevel(character);
  const maxLv = isExtra
    ? Math.max(1, 20 - primaryLv - otherExtra)
    : Math.max(1, 20 - selectedExtraLevels);
  const currentLevel = isExtra ? (extraClass?.level || 1) : primaryLv;
  const rollLevels = isExtra
    ? Array.from({ length: currentLevel }, (_, index) => index + 1)
    : Array.from({ length: Math.max(0, primaryLv - 1) }, (_, index) => index + 2);
  const rollKeyFor = (level) => (isExtra ? `extra_${extraIdx}_${level}` : level);
  const setLevel = (value) => {
    if (isExtra) dispatch({ type: 'extra-class/level', index: extraIdx, level: value });
    else dispatch({ type: 'class/level', level: value });
  };
  if (isExtra && !extraClass?.name) return null;
  return (
    <BuilderPanel
      id="panel-level"
      title={`Level - ${isExtra ? extraClass.name : (character.className || 'Primary')}`}
      icon={HeartPulse}
      note={isExtra
        ? `Class Lv ${currentLevel} (max ${maxLv}) - Total Lv ${character.level} - Hit Die ${faces}`
        : `Class Lv ${currentLevel} - Total Lv ${character.level} - HP ${hp || '-'} - PB +${getProficiencyBonus(character)} - Hit Die ${faces}`}
    >
      <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: 'block', md: 'none' } }}>
          <Select fullWidth value={currentLevel} onChange={(event) => setLevel(Number(event.target.value))}>
            {Array.from({ length: maxLv }, (_, index) => index + 1).map((level) => (
              <MenuItem key={level} value={level}>Level {level}</MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid size={{ xs: 12, md: 'auto' }}>
          <ToggleButtonGroup value={character.hpMode} exclusive size="small" onChange={(_, mode) => mode && dispatch({ type: 'hp/mode', mode })}>
            <ToggleButton value="average">Average HP</ToggleButton>
            <ToggleButton value="rolled">Manual HP</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        {/* The level picks take the room the HP toggle leaves, so they start
            right after it and wrap under each other. */}
        <Grid size={{ xs: 12, md: 'grow' }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {Array.from({ length: maxLv }, (_, index) => index + 1).map((level) => (
              <Chip
                key={level}
                label={level}
                color={level === currentLevel ? 'primary' : 'default'}
                onClick={() => setLevel(level)}
              />
            ))}
          </Stack>
        </Grid>
        {character.hpMode === 'rolled' && rollLevels.length ? (
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {rollLevels.map((level) => (
                <TextField
                  key={level}
                  size="small"
                  type="number"
                  label={isExtra ? `${extraClass?.name || 'MC'} Lv ${level}` : `Lv ${level}`}
                  value={character.hpManualRolls[rollKeyFor(level)] || ''}
                  sx={{ width: 92 }}
                  onChange={(event) => dispatch({ type: 'hp/roll', key: rollKeyFor(level), value: Number(event.target.value) || 0 })}
                  slotProps={{ htmlInput: { min: 1, max: faces || 12 } }}
                />
              ))}
            </Stack>
          </Grid>
        ) : null}
      </Grid>
    </BuilderPanel>
  );
}
