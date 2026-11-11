import { Alert, Box, Button, Grid, Paper, Slider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Dice5 } from 'lucide-react';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { STANDARD_ARRAY } from '../constants.js';
import { pointBuySpent } from '../progression/calculations.js';
import { abilityScoreBonuses, baseAbilityScore, builtAbilityScore } from '../../../shared/character/progression/abilityScores.js';
import { abilityModifier } from '../../../shared/character/progression/abilityModifier.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { ABILITIES, ABILITY_ABBREVIATIONS } from '../../../shared/content/rulesVocabulary.js';
import { baseScoreField } from '../../../shared/character/progression/abilityScores.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

function scoreMod(value) {
  if (value == null) return '-';
  return signed(abilityModifier(value));
}

export default function ScoresStep({ state, dispatch }) {
  const { character } = state;
  const bucket = baseScoreField(character.scoreMethod);
  const scores = character[bucket];
  const spent = pointBuySpent(character.pbScores);

  return (
    <BuilderPanel id="panel-scores" tone={UI_COLORS.secondary} title="Ability Scores" icon={GAME_ICONS.abilityScores} note="Point buy, standard array, dice, or manual scores.">
      <Stack spacing={2}>
        <Tabs value={character.scoreMethod} onChange={(_, method) => dispatch({ type: 'score/method', method })} variant="scrollable">
          <Tab value="pointbuy" label="Point Buy" />
          <Tab value="standard" label="Standard Array" />
          <Tab value="dice" label="Roll Dice" />
          <Tab value="manual" label="Manual" />
        </Tabs>

        {character.scoreMethod === 'pointbuy' ? (
          <Alert severity={spent > 27 ? 'warning' : 'info'}>Point buy spent: {spent} / 27</Alert>
        ) : null}

        {character.scoreMethod === 'standard' ? (
          <Alert severity="info">Standard array pool: {STANDARD_ARRAY.join(', ')}</Alert>
        ) : null}

        {character.scoreMethod === 'dice' ? (
          <Stack direction="row" spacing={1}>
            <Button startIcon={<Dice5 size={ICON_SIZES.md} />} onClick={() => dispatch({ type: 'dice/roll' })}>
              Roll Stats
            </Button>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {character.dicePool.map((value, index) => (
                <Button
                  key={`${value}-${index}`}
                  variant={character.selDiceIdx === index ? 'contained' : 'outlined'}
                  onClick={() => dispatch({ type: 'dice/select', index })}
                >
                  {value}
                </Button>
              ))}
            </Stack>
          </Stack>
        ) : null}

        <Grid container spacing={1.5}>
          {ABILITIES.map((stat) => {
            const baseScore = baseAbilityScore(character, stat);
            const finalScore = builtAbilityScore(character, stat);
            const bonusBreakdown = abilityScoreBonuses(character, stat);

            return (
              <Grid key={stat} size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                  <Stack direction="row" spacing={1.25} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={BUILDER_TEXT.boxTitle}>{ABILITY_ABBREVIATIONS[stat]}</Typography>
                      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
                        <MiniBadge label={`Base ${baseScore}`} color={UI_COLORS.textSecondary} />
                        {bonusBreakdown.map((bonus, index) => (
                          <MiniBadge
                            key={`${bonus.source}-${index}`}
                            label={`${bonus.source} +${bonus.value}`}
                            color={UI_COLORS.accent}
                          />
                        ))}
                      </Stack>
                    </Box>
                    <Box
                      sx={{
                        minWidth: 58,
                        px: 1,
                        py: 0.75,
                        borderRadius: 1,
                        bgcolor: 'action.selected',
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                      }}
                    >
                      <Typography sx={BUILDER_TEXT.figure}>{finalScore ?? '-'}</Typography>
                      <Typography sx={{ ...BUILDER_TEXT.hint, mt: 0.25 }}>
                        {scoreMod(finalScore)}
                      </Typography>
                    </Box>
                  </Stack>
                  {character.scoreMethod === 'dice' ? (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button disabled={character.selDiceIdx == null || scores[stat] != null} onClick={() => dispatch({ type: 'dice/assign', stat })}>
                        Assign
                      </Button>
                      <Button disabled={scores[stat] == null} onClick={() => dispatch({ type: 'dice/unassign', stat })}>
                        Clear
                      </Button>
                    </Stack>
                  ) : null}
                  {character.scoreMethod === 'manual' ? (
                    <TextField
                      fullWidth
                      type="number"
                      value={scores[stat] ?? ''}
                      onChange={(event) => dispatch({ type: 'score/set', bucket, stat, value: Number(event.target.value) || 1 })}
                      sx={{ mt: 1.5 }}
                      slotProps={{ htmlInput: { min: 1, max: 30 } }}
                    />
                  ) : (
                    <Box sx={{ px: 0.75, pt: 2.25, pb: 0.25 }}>
                      <Slider
                        value={scores[stat] ?? 8}
                        min={character.scoreMethod === 'manual' ? 1 : 8}
                        max={character.scoreMethod === 'pointbuy' ? 15 : 20}
                        marks={[
                          { value: 8, label: '8' },
                          { value: character.scoreMethod === 'pointbuy' ? 15 : 20, label: character.scoreMethod === 'pointbuy' ? '15' : '20' },
                        ]}
                        onChange={(_, value) => dispatch({ type: 'score/set', bucket, stat, value })}
                        sx={{
                          '& .MuiSlider-markLabel': BUILDER_TEXT.caption,
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Stack>
    </BuilderPanel>
  );
}
