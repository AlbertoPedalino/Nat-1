import { useState } from 'react';
import { Avatar, Box, Button, IconButton, LinearProgress, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ExternalLink, Minus, Plus, Trash2 } from 'lucide-react';
import { campaignSheetUrl } from '../logic/campaignSheetUrl.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import MonsterToken from './MonsterToken.jsx';

export default function CombatantCard({ combatant, active }) {
  const { dispatch } = useEncounterBuilder();
  const [delta, setDelta] = useState(5);
  const isMonster = combatant.type === 'monster';
  const hpPct = combatant.hpMax ? Math.max(0, Math.round((combatant.hpCurrent / combatant.hpMax) * 100)) : 100;

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
              <Typography variant="caption" color="text.secondary" sx={metaLineSx}>AC {combatant.ac} · Init {combatant.initMod >= 0 ? '+' : ''}{combatant.initMod}</Typography>
            </Box>
          </Stack>
        </Box>

        {/* HP cluster: current/max + bar, heal/damage controls, death saves, remove */}
        <Box sx={hpRowSx}>
          <Box sx={hpColumnSx}>
            <Box sx={hpValueRowSx}>
              <TextField
                size="small"
                label="HP"
                type="number"
                value={combatant.hpCurrent}
                onChange={(event) => dispatch({ type: 'setHp', id: combatant.id, value: event.target.value })}
                onFocus={selectInputText}
                sx={{ width: 72, flex: '0 0 auto' }}
              />
              <Typography color="text.secondary" sx={hpMaxSx}>/ {combatant.hpMax}</Typography>
              {!isMonster ? (
                <TextField
                  size="small"
                  label="Temp"
                  type="number"
                  value={combatant.tempHP ?? 0}
                  onChange={(event) => dispatch({ type: 'setTempHp', id: combatant.id, value: event.target.value })}
                  onFocus={selectInputText}
                  sx={{ width: 72, flex: '0 0 auto' }}
                />
              ) : null}
            </Box>
            <LinearProgress
              variant="determinate"
              value={hpPct}
              sx={{ ...hpBarSx, '& .MuiLinearProgress-bar': { bgcolor: hpColor(hpPct) } }}
            />
          </Box>
          <Box sx={hpControlsSx}>
            <Tooltip title="Heal">
              <IconButton color="success" onClick={() => dispatch({ type: 'modifyHp', id: combatant.id, delta: Number(delta) || 1 })}>
                <Plus size={16} />
              </IconButton>
            </Tooltip>
            <TextField
              size="small"
              type="number"
              value={delta}
              onChange={(event) => setDelta(event.target.value)}
              onFocus={selectInputText}
              sx={{ width: 70, flex: '0 0 auto' }}
            />
            <Tooltip title="Damage">
              <IconButton color="error" onClick={() => dispatch({ type: 'modifyHp', id: combatant.id, delta: -(Number(delta) || 1) })}>
                <Minus size={16} />
              </IconButton>
            </Tooltip>
          </Box>
          {!isMonster && combatant.hpCurrent === 0 && combatant.deathSaves ? <DeathSaves combatant={combatant} /> : null}
          <Tooltip title="Remove">
            <IconButton color="error" onClick={remove}>
              <Trash2 size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
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

const metaLineSx = { fontSize: '0.72rem' };

const hpColumnSx = { display: 'flex', flexDirection: 'column', gap: 0.4, flex: '0 0 auto' };

const hpValueRowSx = { display: 'flex', alignItems: 'center', gap: 0.5 };

const hpMaxSx = { whiteSpace: 'nowrap', fontSize: '0.82rem' };

const hpBarSx = {
  width: '100%',
  height: 5,
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.08)',
};

const hpControlsSx = { display: 'flex', alignItems: 'center', gap: 0.25, flex: '0 0 auto' };

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
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  rowGap: 0.8,
  columnGap: 1.5,
  flex: '1 1 360px',
  minWidth: 0,
  '& .MuiInputBase-input': {
    py: 0.6,
    fontSize: '0.85rem',
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.78rem',
  },
  '& .MuiIconButton-root': {
    width: 30,
    height: 30,
    flex: '0 0 auto',
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
