import { Grid, MenuItem, Select, Stack, TextField } from '@mui/material';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { getProficiencyBonus } from '../../../shared/character/progression/proficiency.js';
import { computeMaxHp, hitDieFaces } from '../../../shared/character/combat/hp.js';
import { multiclassLevels, primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { activeClassCharacter, activeExtraClass } from '../state/activeClass.js';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

export default function LevelPanel({ character, dispatch }) {
  const tab = character.activeClassTab || 0;
  const isExtra = tab > 0;
  const extraIdx = tab - 1;
  const extraClass = activeExtraClass(character);
  const cls = activeClassCharacter(character).cls;
  const hp = computeMaxHp(character);
  const faces = cls ? `d${hitDieFaces(cls)}` : '?';
  const selectedExtraLevels = multiclassLevels(character.extraClasses);
  const otherExtra = multiclassLevels(character.extraClasses, { except: extraIdx });
  const primaryLv = primaryClassLevel(character);
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
    <BuilderPanel tone={ENTITY_COLORS.class}
      id="panel-level"
      title={`Level - ${isExtra ? extraClass.name : (character.className || 'Primary')}`}
      icon={GAME_ICONS.level}
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
          <ChoiceToggle
            value={character.hpMode}
            onChange={(mode) => dispatch({ type: 'hp/mode', mode })}
            options={[{ value: 'average', label: 'Average HP' }, { value: 'rolled', label: 'Manual HP' }]}
          />
        </Grid>
        {/* The level picks take the room the HP toggle leaves, so they start
            right after it and wrap under each other. */}
        <Grid size={{ xs: 12, md: 'grow' }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <ChoiceToggle
            wrap
            value={currentLevel}
            onChange={setLevel}
            options={Array.from({ length: maxLv }, (_, index) => ({ value: index + 1, label: index + 1 }))}
          />
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
