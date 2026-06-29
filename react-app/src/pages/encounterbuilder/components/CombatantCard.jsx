import { useState } from 'react';
import { Avatar, Box, Button, IconButton, LinearProgress, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { ExternalLink, Minus, Plus, Trash2 } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import MonsterToken from './MonsterToken.jsx';

export default function CombatantCard({ combatant, active }) {
  const { dispatch } = useEncounterBuilder();
  const [delta, setDelta] = useState(5);
  const isMonster = combatant.type === 'monster';
  const hpPct = combatant.hpMax ? Math.max(0, Math.round((combatant.hpCurrent / combatant.hpMax) * 100)) : 100;

  const openMonster = () => {
    if (combatant.monsterData) {
      dispatch({ type: 'selectStatblock', payload: { monster: combatant.monsterData, combatantId: combatant.id } });
    }
  };

  const remove = () => {
    if (!window.confirm('Remove this combatant?')) return;
    dispatch({ type: 'removeCombatant', id: combatant.id });
  };

  return (
    <Paper sx={{ ...cardSx, ...(active ? activeSx : null), ...(combatant.isDead ? deadSx : null) }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '58px minmax(0,0.8fr) minmax(400px,1.35fr)' }, gap: 0.9, alignItems: 'center' }}>
        <TextField
          size="small"
          label="Init"
          type="number"
          value={combatant.initiative}
          onChange={(event) => dispatch({ type: 'setInitiative', id: combatant.id, value: event.target.value })}
        />
        <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
          {isMonster && combatant.monsterData ? (
            <Box onClick={openMonster} sx={{ cursor: 'pointer' }}>
              <MonsterToken monster={combatant.monsterData} size={34} fallbackText={combatant.name?.[0]} />
            </Box>
          ) : (
            <Avatar sx={{ width: 34, height: 34, bgcolor: combatant.color || '#5c8fe0', color: '#101010', fontSize: 11, fontWeight: 800 }}>PC</Avatar>
          )}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} sx={{ minWidth: 0, alignItems: 'center' }}>
              {combatant.shape ? (
                <Typography sx={{ color: combatant.shapeClr, fontWeight: 900, flexShrink: 0 }}>
                  {combatant.shape}{combatant.label}
                </Typography>
              ) : null}
              {isMonster && combatant.monsterData ? (
                <Button size="small" onClick={openMonster} sx={{ justifyContent: 'flex-start', minWidth: 0, px: 0.5 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{combatant.name}</span>
                </Button>
              ) : combatant.sourceId ? (
                <Button
                  component="a"
                  href={campaignSheetUrl(combatant.sourceId)}
                  target="_blank"
                  rel="noopener"
                  size="small"
                  endIcon={<ExternalLink size={13} />}
                  sx={{ justifyContent: 'flex-start', minWidth: 0, px: 0.5 }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{combatant.name}</span>
                </Button>
              ) : (
                <Typography fontWeight={800} noWrap>{combatant.name}</Typography>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>AC {combatant.ac} · Init {combatant.initMod >= 0 ? '+' : ''}{combatant.initMod}</Typography>
          </Box>
        </Stack>
        <Box sx={hpRowSx}>
          <LinearProgress
            variant="determinate"
            value={hpPct}
            sx={{
              flex: '1 1 120px',
              minWidth: 90,
              height: 6,
              borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': { bgcolor: hpColor(hpPct) },
            }}
          />
          <TextField
            size="small"
            label="HP"
            type="number"
            value={combatant.hpCurrent}
            onChange={(event) => dispatch({ type: 'setHp', id: combatant.id, value: event.target.value })}
            onFocus={selectInputText}
            onClick={selectInputText}
            onMouseUp={keepInputSelection}
            sx={{ width: 64, flex: '0 0 auto' }}
          />
          <Typography color="text.secondary" sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>/ {combatant.hpMax}</Typography>
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
            onClick={selectInputText}
            onMouseUp={keepInputSelection}
            sx={{ width: 52, flex: '0 0 auto' }}
          />
          <Tooltip title="Damage">
            <IconButton color="error" onClick={() => dispatch({ type: 'modifyHp', id: combatant.id, delta: -(Number(delta) || 1) })}>
              <Minus size={16} />
            </IconButton>
          </Tooltip>
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

function keepInputSelection(event) {
  event.preventDefault();
}

function campaignSheetUrl(id) {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}/campaign-sheet?id=${encodeURIComponent(id)}&edit=1`;
}

const cardSx = {
  p: 0.9,
  bgcolor: 'background.paper',
};

const hpRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: { xs: 'flex-start', md: 'flex-end' },
  flexWrap: 'nowrap',
  gap: 0.4,
  minWidth: 0,
  overflowX: 'auto',
  '& .MuiInputBase-input': {
    py: 0.55,
    fontSize: '0.82rem',
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.76rem',
  },
  '& .MuiIconButton-root': {
    width: 28,
    height: 28,
    flex: '0 0 auto',
  },
};

const activeSx = {
  borderColor: 'primary.main',
  boxShadow: '0 0 0 1px rgba(215,173,82,0.28)',
};

const deadSx = {
  opacity: 0.58,
};
