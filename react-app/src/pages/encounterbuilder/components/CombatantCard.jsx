import { useState } from 'react';
import { Avatar, Box, Button, Collapse, IconButton, LinearProgress, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChevronDown, ChevronUp, ExternalLink, HeartPulse, Shield, Sparkles, X } from 'lucide-react';
import HpStepper from '../../../shared/character/HpStepper.jsx';
import { campaignSheetUrl } from '../logic/campaignSheetUrl.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import CombatantConditions from './CombatantConditions.jsx';
import MonsterToken from './MonsterToken.jsx';

export default function CombatantCard({ combatant, active }) {
  const { dispatch } = useEncounterBuilder();
  const [hpAmt, setHpAmt] = useState('5');
  const [tempAmt, setTempAmt] = useState('5');
  const [modAmt, setModAmt] = useState('5');
  // Temp HP / max-HP-modifier rows are secondary: collapsed by default to keep
  // the initiative list scannable. When collapsed, an active value still shows
  // as a flag next to the HP fields so nothing goes silently missing.
  const [hpDetailsOpen, setHpDetailsOpen] = useState(false);
  const isMonster = combatant.type === 'monster';
  const hpPct = combatant.hpMax ? Math.max(0, Math.round((combatant.hpCurrent / combatant.hpMax) * 100)) : 100;
  const isDown = !isMonster && combatant.hpCurrent === 0 && Boolean(combatant.deathSaves);
  const tempHp = Number(combatant.tempHP) || 0;
  const maxHpBonus = Number(combatant.maxHPBonus) || 0;
  const maxHpBonusText = `${maxHpBonus > 0 ? '+' : ''}${maxHpBonus}`;

  const openDetails = () => {
    if (combatant.monsterData) {
      dispatch({ type: 'selectStatblock', payload: { monster: combatant.monsterData, combatantId: combatant.id } });
      return;
    }
    if (!isMonster) {
      dispatch({
        type: 'selectStatblock',
        payload: { playerSourceId: combatant.sourceId || null, combatantId: combatant.id },
      });
    }
  };

  const remove = () => {
    if (!window.confirm('Remove this combatant?')) return;
    dispatch({ type: 'removeCombatant', id: combatant.id });
  };

  return (
    <Paper
      aria-current={active ? 'true' : undefined}
      sx={(theme) => ({
        ...cardSx,
        ...(active ? buildActiveSx(theme) : null),
        ...(combatant.isDead ? deadSx : null),
      })}
    >
      <Tooltip title="Remove">
        <IconButton color="error" onClick={remove} size="small" sx={removeButtonSx} aria-label="Remove combatant">
          <X size={15} />
        </IconButton>
      </Tooltip>
      <Box sx={rowSx}>
        {/* Identity cluster: initiative + token + name + AC */}
        <Box sx={identityClusterSx}>
          <TextField
            size="small"
            label="Init"
            type="number"
            value={combatant.initiative}
            onChange={(event) => dispatch({ type: 'setInitiative', id: combatant.id, value: event.target.value })}
            sx={{ width: 62, flex: '0 0 auto' }}
          />
          <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center', flex: 1 }}>
            {isMonster && combatant.monsterData ? (
              <Box onClick={openDetails} sx={{ cursor: 'pointer' }}>
                <MonsterToken monster={combatant.monsterData} size={34} fallbackText={combatant.name?.[0]} />
              </Box>
            ) : (
              <Avatar
                onClick={openDetails}
                sx={(theme) => ({ ...avatarBaseSx, bgcolor: combatant.color || theme.palette.pcToken, cursor: 'pointer' })}
              >
                PC
              </Avatar>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, alignItems: 'center' }}>
                {combatant.shape ? (
                  <Typography sx={{ color: combatant.shapeClr, fontWeight: 900, flexShrink: 0 }}>
                    {combatant.shape}{combatant.label}
                  </Typography>
                ) : null}
                {isMonster && combatant.monsterData ? (
                  <Button size="small" onClick={openDetails} sx={nameButtonSx}>
                    <span style={nameSpanStyle}>{combatant.name}</span>
                  </Button>
                ) : !isMonster ? (
                  <Button size="small" onClick={openDetails} sx={nameButtonSx}>
                    <span style={nameSpanStyle}>{combatant.name}</span>
                  </Button>
                ) : (
                  <Typography fontWeight={800} noWrap>{combatant.name}</Typography>
                )}
                {!isMonster && combatant.sourceId ? (
                  <Tooltip title="Open sheet">
                    <IconButton
                      component="a"
                      href={campaignSheetUrl(combatant.sourceId)}
                      target="_blank"
                      rel="noopener"
                      size="small"
                      sx={sheetLinkButtonSx}
                      aria-label={`Open ${combatant.name} sheet`}
                    >
                      <ExternalLink size={13} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Stack>
              {/* AC only: the initiative modifier lived here too, but the rolled
                  initiative is already the field on the left, so the modifier
                  was noise competing with the one stat read every turn. */}
              <Tooltip title="Armor Class">
                <Box sx={acBadgeSx}>
                  <Shield size={13} />
                  <Box component="span" sx={acLabelSx}>AC</Box>
                  <Box component="span" sx={acValueSx}>{combatant.ac}</Box>
                </Box>
              </Tooltip>
            </Box>
          </Stack>
        </Box>

        {/* HP panel: value + [amount] − stepper per row (mirrors the sheet HP block) */}
        <Box sx={hpRowSx}>
          {isDown ? (
            <Box sx={hpPanelRowSx}>
              <DeathSaves combatant={combatant} />
              <HpStepper
                amount={hpAmt}
                onAmount={setHpAmt}
                onPlus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: n })}
                onMinus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: -n })}
                plusColor="success.main"
                minusColor="error.main"
                plusLabel="Heal"
                minusLabel="Damage"
              />
            </Box>
          ) : (
            <>
              {/* Current / Max + heal / damage */}
              <Box sx={hpPanelRowSx}>
                <Box sx={hpValueRowSx}>
                  <HpField
                    label="HP"
                    value={combatant.hpCurrent}
                    onChange={(value) => dispatch({ type: 'setHp', id: combatant.id, value })}
                  />
                  <Typography color="text.secondary" sx={hpMaxSx}>/</Typography>
                  <HpField
                    label="Max"
                    value={combatant.hpMax}
                    onChange={(value) => dispatch({ type: 'setMaxHp', id: combatant.id, value })}
                  />
                </Box>
                <HpStepper
                  amount={hpAmt}
                  onAmount={setHpAmt}
                  onPlus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: n })}
                  onMinus={(n) => dispatch({ type: 'modifyHp', id: combatant.id, delta: -n })}
                  plusColor="success.main"
                  minusColor="error.main"
                  plusLabel="Heal"
                  minusLabel="Damage"
                />
              </Box>

              {/* Disclosure row: the toggle stays put and the collapsed flags
                  sit exactly where their full rows expand, so opening the
                  section reads as the flags unfolding rather than as new
                  content appearing elsewhere. */}
              <Box sx={hpSummaryRowSx}>
                <Button
                  size="small"
                  onClick={() => setHpDetailsOpen((open) => !open)}
                  aria-expanded={hpDetailsOpen}
                  startIcon={hpDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  sx={hpToggleSx}
                >
                  HP modifiers
                </Button>
                {!hpDetailsOpen && tempHp !== 0 ? (
                  <HpFlag Icon={Sparkles} title={`Temp HP: ${tempHp}`} text={tempHp} />
                ) : null}
                {!hpDetailsOpen && maxHpBonus !== 0 ? (
                  <HpFlag Icon={HeartPulse} title={`Max HP modifier: ${maxHpBonusText}`} text={maxHpBonusText} />
                ) : null}
              </Box>

              <Collapse in={hpDetailsOpen} unmountOnExit sx={collapseSx}>
                <Box sx={hpDetailsSx}>
                  {/* Temp HP */}
                  <Box sx={hpPanelRowSx}>
                    <HpField
                      label="Temp"
                      value={combatant.tempHP ?? 0}
                      onChange={(value) => dispatch({ type: 'setTempHp', id: combatant.id, value })}
                    />
                    <HpStepper
                      amount={tempAmt}
                      onAmount={setTempAmt}
                      onPlus={(n) => dispatch({ type: 'setTempHp', id: combatant.id, value: (Number(combatant.tempHP) || 0) + n })}
                      onMinus={(n) => dispatch({ type: 'setTempHp', id: combatant.id, value: (Number(combatant.tempHP) || 0) - n })}
                      plusLabel="Add temp HP"
                      minusLabel="Remove temp HP"
                    />
                  </Box>

                  {/* Max HP modifier (delta over base max; works for PCs and monsters) */}
                  <Box sx={hpPanelRowSx}>
                    <HpField
                      label="Max mod"
                      value={combatant.maxHPBonus ?? 0}
                      onChange={(value) => {
                        const base = (Number(combatant.hpMax) || 0) - (Number(combatant.maxHPBonus) || 0);
                        dispatch({ type: 'setMaxHp', id: combatant.id, value: base + (Number(value) || 0) });
                      }}
                    />
                    <HpStepper
                      amount={modAmt}
                      onAmount={setModAmt}
                      onPlus={(n) => dispatch({ type: 'setMaxHp', id: combatant.id, value: (Number(combatant.hpMax) || 0) + n })}
                      onMinus={(n) => dispatch({ type: 'setMaxHp', id: combatant.id, value: (Number(combatant.hpMax) || 0) - n })}
                      plusLabel="Increase max HP"
                      minusLabel="Decrease max HP"
                    />
                  </Box>
                </Box>
              </Collapse>

              <LinearProgress
                variant="determinate"
                value={hpPct}
                sx={{ ...hpBarSx, '& .MuiLinearProgress-bar': { bgcolor: hpColor(hpPct) } }}
              />
            </>
          )}
        </Box>

        {/* Full width under both columns: condition pills are read while
            scanning the initiative order, so they must not compete with the
            identity or HP clusters for horizontal space. */}
        <Box sx={conditionsRowSx}>
          <CombatantConditions combatant={combatant} />
        </Box>
      </Box>
    </Paper>
  );
}

function HpField({ label, value, onChange }) {
  return (
    <TextField
      size="small"
      label={label}
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={selectInputText}
      sx={hpFieldSx}
    />
  );
}

// Collapsed-state marker for a value hidden inside the HP details: same icons
// the sheet's HP block uses for Temp / Max mod, so the two surfaces read alike.
function HpFlag({ Icon, title, text }) {
  return (
    <Tooltip title={title}>
      <Box sx={hpFlagSx}>
        <Icon size={11} />
        <Box component="b">{text}</Box>
      </Box>
    </Tooltip>
  );
}

function DeathSaves({ combatant }) {
  const { dispatch } = useEncounterBuilder();
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" color="success.main">S</Typography>
      {[1, 2, 3].map((value) => (
        <Dot
          key={`s-${value}`}
          active={combatant.deathSaves.s >= value}
          color="success.main"
          onClick={() => dispatch({ type: 'setDeathSave', id: combatant.id, saveType: 's', value })}
        />
      ))}
      <Typography variant="caption" color="error.main">F</Typography>
      {[1, 2, 3].map((value) => (
        <Dot
          key={`f-${value}`}
          active={combatant.deathSaves.f >= value}
          color="error.main"
          onClick={() => dispatch({ type: 'setDeathSave', id: combatant.id, saveType: 'f', value })}
        />
      ))}
    </Stack>
  );
}

function Dot({ active, color, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        border: '1px solid',
        borderColor: color,
        bgcolor: active ? color : 'transparent',
        cursor: 'pointer',
      }}
    />
  );
}

function hpColor(percent) {
  if (percent > 50) return 'success.main';
  if (percent > 25) return 'warning.main';
  return 'error.main';
}

function selectInputText(event) {
  event.target.select();
}

const nameSpanStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const rowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: { xs: 1.5, sm: 3 },
  rowGap: 1.2,
  pr: 3,
};

const removeButtonSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  zIndex: 1,
  color: 'text.secondary',
  '&:hover': { color: 'error.main' },
};

const identityClusterSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  flex: '1 1 240px',
  minWidth: 0,
};

const avatarBaseSx = { width: 34, height: 34, color: '#101010', fontSize: 11, fontWeight: 800 };

const nameButtonSx = { justifyContent: 'flex-start', minWidth: 0, px: 0.5 };

const sheetLinkButtonSx = {
  width: 24,
  height: 24,
  flex: '0 0 auto',
  color: 'text.secondary',
};

// AC is the number a GM reads on every attack roll, so it gets a bordered
// badge instead of a caption: prominence comes from size and framing, not from
// a new accent color that would fight the gold active-turn highlight.
const acBadgeSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.4,
  mt: 0.3,
  px: 0.7,
  py: '1px',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.04)',
  color: 'text.secondary',
  lineHeight: 1,
};

const acLabelSx = { fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em' };

const acValueSx = { fontSize: '1rem', fontWeight: 800, color: 'text.primary' };

const conditionsRowSx = {
  flex: '1 1 100%',
  minWidth: 0,
  pt: 0.4,
  borderTop: 1,
  borderColor: 'divider',
};

const hpSummaryRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  flexWrap: 'wrap',
  minHeight: 22,
};

// Labelled disclosure: the row must say what it hides, otherwise a bare chevron
// on a combatant with no temp HP and no max-HP modifier means nothing.
const hpToggleSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.5,
  py: 0,
  color: 'text.secondary',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  '& .MuiButton-startIcon': { mr: 0.4 },
  '&:hover': { color: 'text.primary' },
};

const hpFlagSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.3,
  px: 0.5,
  py: '1px',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  color: 'primary.main',
  fontSize: '0.7rem',
  lineHeight: 1,
  flex: '0 0 auto',
};

const hpDetailsSx = { display: 'flex', flexDirection: 'column', gap: 0.7 };

// A fully collapsed Collapse still renders a zero-height box, which keeps
// earning a slot in the parent's flex gap. MUI tags that state with
// .MuiCollapse-hidden once the exit transition ends, so dropping the box out of
// layout there removes the phantom gap without costing the animation.
const collapseSx = { '&.MuiCollapse-hidden': { display: 'none' } };

const hpPanelRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  flexWrap: 'wrap',
  rowGap: 0.6,
};

const hpValueRowSx = { display: 'flex', alignItems: 'center', gap: 0.5 };

const hpFieldSx = { width: 72, flex: '0 0 auto' };

const hpMaxSx = { whiteSpace: 'nowrap', fontSize: '0.82rem' };

const hpBarSx = {
  width: '100%',
  height: 5,
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.08)',
};

const cardSx = {
  position: 'relative',
  p: 0.9,
  bgcolor: 'background.paper',
  border: '2px solid transparent',
  borderRadius: 1.5,
  transition: 'border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
};

const hpRowSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.7,
  flex: '1 1 300px',
  minWidth: 0,
  '& .MuiInputBase-input': {
    py: 0.6,
    fontSize: '0.85rem',
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.78rem',
  },
};

// Active-turn highlight, derived from the theme's primary color so it tracks
// any palette change (no hardcoded gold). Transparent base border in cardSx
// keeps the toggle from shifting layout; ::before draws the left accent bar.
function buildActiveSx(theme) {
  const accent = theme.palette.primary.main;
  return {
    borderColor: accent,
    bgcolor: alpha(accent, 0.12),
    boxShadow: `0 0 0 1px ${alpha(accent, 0.55)}, 0 0 16px ${alpha(accent, 0.3)}`,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
      bgcolor: accent,
      borderRadius: '6px 0 0 6px',
    },
  };
}

const deadSx = {
  opacity: 0.58,
};
