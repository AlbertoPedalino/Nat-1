import { Alert, Box, Button, Chip, Grid, Paper, Slider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Dice5, Dumbbell } from 'lucide-react';
import BuilderPanel from '../components/BuilderPanel.jsx';
import { PB_COST, STANDARD_ARRAY, STAT_LABELS, STATS } from '../constants.js';
import { getAbilityScoreBonusBreakdown, getBaseScore, getFinalScore, pointBuySpent } from '../logic/calculations.js';
import { getActiveScores } from '../state.js';

function scoreMod(value) {
  if (value == null) return '-';
  const mod = Math.floor((Number(value) - 10) / 2);
  return `${mod >= 0 ? '+' : ''}${mod}`;
}

function methodBucket(method) {
  if (method === 'manual') return 'manualScores';
  if (method === 'standard') return 'arrAssign';
  if (method === 'dice') return 'diceAssign';
  return 'pbScores';
}

export default function ScoresStep({ state, dispatch }) {
  const { character } = state;
  const scores = getActiveScores(character);
  const bucket = methodBucket(character.scoreMethod);
  const spent = pointBuySpent(character.pbScores);

  return (
    <BuilderPanel id="panel-scores" title="Ability Scores" icon={Dumbbell} note="Point buy, standard array, dice, and manual modes converted from score tab.">
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
            <Button startIcon={<Dice5 size={16} />} onClick={() => dispatch({ type: 'dice/roll' })}>
              Roll Stats
            </Button>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
          {STATS.map((stat) => {
            const baseScore = getBaseScore(character, stat);
            const finalScore = getFinalScore(character, stat);
            const bonusBreakdown = getAbilityScoreBonusBreakdown(character, stat);

            return (
              <Grid key={stat} item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.25}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="h2" sx={{ lineHeight: 1.15 }}>{STAT_LABELS[stat]}</Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        <Chip size="small" label={`Base ${baseScore}`} variant="outlined" />
                        {bonusBreakdown.map((bonus, index) => (
                          <Chip
                            key={`${bonus.source}-${index}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                            label={`${bonus.source} +${bonus.value}`}
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
                      <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1 }}>{finalScore ?? '-'}</Typography>
                      <Typography color="text.secondary" sx={{ fontSize: '0.72rem', mt: 0.35 }}>
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
                      inputProps={{ min: 1, max: 30 }}
                      onChange={(event) => dispatch({ type: 'score/set', bucket, stat, value: Number(event.target.value) || 1 })}
                      sx={{ mt: 1.5 }}
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
                          '& .MuiSlider-markLabel': {
                            fontSize: '0.68rem',
                            color: 'text.secondary',
                          },
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
