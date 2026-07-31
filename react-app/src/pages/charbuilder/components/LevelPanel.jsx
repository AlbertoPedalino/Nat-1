import { Chip, Grid, MenuItem, Select, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { HeartPulse } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';
import { calcMaxHp, getPrimaryClassLevel, getProficiencyBonus } from '../logic/calculations.js';

export default function LevelPanel({ character, dispatch }) {
  const tab = character.activeClassTab || 0;
  const isExtra = tab > 0;
  const extraIdx = tab - 1;
  const extraClass = isExtra ? character.extraClasses[extraIdx] : null;
  const cls = isExtra ? extraClass?.cls : character.cls;
  const hp = calcMaxHp(character);
  const faces = cls?.hd?.faces || cls?.hitDie || '?';
  const selectedExtraLevels = (character.extraClasses || [])
    .filter((extra) => extra?.name)
    .reduce((sum, extra) => sum + (Number(extra.level) || 1), 0);
  const otherExtra = (character.extraClasses || [])
    .filter((extra, idx) => idx !== extraIdx && extra?.name)
    .reduce((sum, extra) => sum + (Number(extra.level) || 1), 0);
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
        : `Class Lv ${currentLevel} - Total Lv ${character.level} - HP ${hp || '-'} - PB +${getProficiencyBonus(character.level)} - Hit Die ${faces}`}
    >
      <Grid container spacing={1.5} alignItems="center">
        <Grid item xs={12} md={4} sx={{ display: { xs: 'block', md: 'none' } }}>
          <Select fullWidth value={currentLevel} onChange={(event) => setLevel(Number(event.target.value))}>
            {Array.from({ length: maxLv }, (_, index) => index + 1).map((level) => (
              <MenuItem key={level} value={level}>Level {level}</MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12} md={4}>
          <ToggleButtonGroup value={character.hpMode} exclusive size="small" onChange={(_, mode) => mode && dispatch({ type: 'hp/mode', mode })}>
            <ToggleButton value="average">Average HP</ToggleButton>
            <ToggleButton value="rolled">Manual HP</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid item xs={12} md={isExtra ? 12 : 8} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
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
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {rollLevels.map((level) => (
                <TextField
                  key={level}
                  size="small"
                  type="number"
                  label={isExtra ? `${extraClass?.name || 'MC'} Lv ${level}` : `Lv ${level}`}
                  value={character.hpManualRolls[rollKeyFor(level)] || ''}
                  inputProps={{ min: 1, max: faces || 12 }}
                  sx={{ width: 92 }}
                  onChange={(event) => dispatch({ type: 'hp/roll', key: rollKeyFor(level), value: Number(event.target.value) || 0 })}
                />
              ))}
            </Stack>
          </Grid>
        ) : null}
      </Grid>
    </BuilderPanel>
  );
}
