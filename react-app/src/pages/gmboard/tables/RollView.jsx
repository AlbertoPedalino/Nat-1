import { Box, Button, Stack, Typography, alpha, useTheme } from '@mui/material';
import { AlertTriangle, Coins, CornerDownRight, Dices, Flame, History, Leaf, Map, Swords, Trash2 } from 'lucide-react';
import ResultBadge from '../ui/ResultBadge.jsx';
import TierSelector from '../ui/TierSelector.jsx';
import { ROLL_TABLES, describeRoll, followUpTables, formatDice, summarizeStats } from './rollTable.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';

const TABLE_ICON = { event: Map, encounter: Swords, loot: Coins, trap: Flame, compl: AlertTriangle, env: Leaf };
const TABLE_LABEL = Object.fromEntries(ROLL_TABLES.map((table) => [table.id, table.label]));

const EVENT_TONE = { encounter: 'encounter', loot: 'loot', camp_nemico: 'camp', nothing: 'none' };
const COMPL_TONE = { Encounter: 'encounter', 'Environment Damage': 'trap', Environment: 'environment', None: 'none' };

function pick(map, key, fallback) {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback;
}

function rollTone(roll, palette) {
  const { result, difficulty, rarity } = palette;
  switch (roll.tableId) {
    case 'event': return result[pick(EVENT_TONE, roll.data.type, 'trigger')];
    case 'encounter': return pick(difficulty, roll.data.diff, rarity.Common);
    case 'loot': return pick(rarity, roll.data.rarita, rarity.Common);
    case 'trap': return result.trap;
    case 'compl': return result[pick(COMPL_TONE, roll.data.type, 'none')];
    case 'env': return pick(rarity, roll.data.gravita, rarity.Common);
    default: return rarity.Common;
  }
}

// One named field of a result: what it is, its value, and a note when the
// value needs one (which check a DC is for, the dice behind it).
function Stat({ label, note, children }) {
  return (
    <Box sx={statSx}>
      <Box component="dt" sx={statLabelSx}>{label}</Box>
      <Box component="dd" sx={statBodySx}>
        {children}
        {note ? <Box component="span" sx={statNoteSx}>{note}</Box> : null}
      </Box>
    </Box>
  );
}

function TableCard({ table, roll, latest, tier, onRoll }) {
  const theme = useTheme();
  const Icon = TABLE_ICON[table.id];
  const tone = roll ? rollTone(roll, theme.palette.gmboard) : null;
  const described = roll ? describeRoll(roll) : null;
  const followUps = roll ? followUpTables(roll) : [];

  return (
    <Box sx={{ ...cardSx, ...(latest ? { borderColor: 'primary.main' } : {}) }}>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ ...headerBandSx, bgcolor: theme.palette.gmboard.headerOverlay }}
      >
        <Icon size={13} color={theme.palette.primary.main} />
        <Typography sx={cardTitleSx}>{table.label}</Typography>
        <Typography sx={detailSx}>{table.dice}</Typography>
        {table.tiered ? <ResultBadge tone={theme.palette.gmboard.tier[tier].color}>T{tier}</ResultBadge> : null}
      </Stack>
      <Stack spacing={1} sx={{ p: 1.25 }}>
        <Box aria-live="polite" sx={resultAreaSx}>
          {roll ? (
            <Box sx={{ ...slotSx, borderLeftColor: tone, bgcolor: alpha(tone, 0.08) }}>
              <Box component="dl" sx={statsSx}>
                <Stat label={described.titleLabel}>
                  <ResultBadge tone={tone}>{described.title}</ResultBadge>
                </Stat>
                {described.stats.map((stat) => (
                  <Stat key={stat.label} label={stat.label} note={stat.note}>
                    <Box component="span" sx={stat.emphasis ? statEmphasisSx : statValueSx}>{stat.value}</Box>
                  </Stat>
                ))}
              </Box>
              <Typography sx={diceSx}>
                Table roll: {formatDice(roll)}{roll.tier && roll.tier !== tier ? ` · rolled at T${roll.tier}` : ''}
              </Typography>
            </Box>
          ) : (
            <Typography sx={emptySx}>Not rolled yet.</Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.75} sx={wrapRowSx}>
          <Button
            size="small"
            variant="contained"
            startIcon={<Dices size={14} />}
            aria-label={`Roll ${table.label}`}
            onClick={() => onRoll(table.id)}
          >
            Roll
          </Button>
          {followUps.map((id) => (
            <Button
              key={id}
              size="small"
              variant="outlined"
              startIcon={<CornerDownRight size={13} />}
              aria-label={`Then roll ${TABLE_LABEL[id]}`}
              onClick={() => onRoll(id)}
              sx={followUpSx}
            >
              {TABLE_LABEL[id]}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

function HistoryRow({ roll, last }) {
  const theme = useTheme();
  const Icon = TABLE_ICON[roll.tableId];
  const tone = rollTone(roll, theme.palette.gmboard);
  const { title, stats } = describeRoll(roll);
  const detail = summarizeStats(stats);

  return (
    <Box component="li" sx={{ ...historyRowSx, borderBottom: last ? 'none' : '1px solid', borderColor: 'divider' }}>
      <Icon size={13} color={theme.palette.text.secondary} />
      <Typography sx={historyTableSx}>
        {TABLE_LABEL[roll.tableId]}{roll.tier ? ` T${roll.tier}` : ''}
      </Typography>
      <ResultBadge tone={tone}>{title}</ResultBadge>
      {detail ? <Typography sx={historyDetailSx}>{detail}</Typography> : null}
      <Typography sx={detailSx}>{formatDice(roll)}</Typography>
    </Box>
  );
}

export default function RollView() {
  const { state, dispatch, rollOnTable } = useGmBoard();
  const theme = useTheme();
  const { rolls, rollTier } = state;

  return (
    <Stack spacing={2}>
      <Stack spacing={1.5} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Dices size={14} color={theme.palette.primary.main} />
          <Typography sx={titleSx}>Table Roller</Typography>
        </Box>
        <TierSelector
          label="Tier — Encounter and Trap"
          value={rollTier}
          onChange={(tier) => dispatch({ type: 'setRollTier', tier })}
        />
        <Typography sx={hintSx}>
          One roll on one table. Nothing here moves the clock, the weather or the session log.
        </Typography>
      </Stack>

      <Box sx={gridSx}>
        {ROLL_TABLES.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            roll={rolls.find((roll) => roll.tableId === table.id)}
            latest={rolls[0]?.tableId === table.id}
            tier={rollTier}
            onRoll={rollOnTable}
          />
        ))}
      </Box>

      <Box sx={{ ...historySx, bgcolor: theme.palette.gmboard.panelOverlay }}>
        <Stack direction="row" spacing={1} sx={wrapRowSx}>
          <History size={13} color={theme.palette.text.secondary} />
          <Typography sx={historyTitleSx}>Roll History</Typography>
          <Typography sx={historyNoteSx}>Kept until this page is reloaded.</Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={13} />}
            disabled={!rolls.length}
            onClick={() => dispatch({ type: 'clearRolls' })}
          >
            Clear
          </Button>
        </Stack>
        {rolls.length ? (
          <Box component="ol" aria-label="Roll history, newest first" sx={historyListSx}>
            {rolls.map((roll, index) => <HistoryRow key={roll.id} roll={roll} last={index === rolls.length - 1} />)}
          </Box>
        ) : (
          <Typography sx={{ ...emptySx, mt: 1 }}>No rolls yet.</Typography>
        )}
      </Box>
    </Stack>
  );
}

const panelSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const hintSx = {
  fontSize: '0.7rem',
  color: 'text.secondary',
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
  gap: 1.25,
};

const cardSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  overflow: 'hidden',
};

// A fixed height, so the cards with a tier badge line up with the ones without.
const headerBandSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
  minHeight: 36,
  px: 1.25,
  py: 0.75,
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const wrapRowSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
  rowGap: 0.5,
};

const cardTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.78rem',
  letterSpacing: '0.04em',
  color: 'primary.main',
};

// Tall enough for one row of fields and the dice line, so a card does not jump
// from one roll to the next.
const resultAreaSx = {
  minHeight: 96,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const slotSx = {
  p: 0.75,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderLeftWidth: 3,
};

const detailSx = {
  fontSize: '0.68rem',
  color: 'text.secondary',
};

const statsSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  columnGap: 2,
  rowGap: 0.75,
  m: 0,
};

const statSx = {
  minWidth: 0,
};

const statLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.58rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  lineHeight: 1.5,
};

const statBodySx = {
  m: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};

// One size for every value, so a row of fields shares a baseline; the numbers
// a GM reads out differ by weight and colour only.
const statValueSx = {
  fontSize: '0.95rem',
  lineHeight: 1.45,
  color: 'text.primary',
};

const statEmphasisSx = {
  ...statValueSx,
  fontWeight: 700,
  color: 'primary.main',
};

const statNoteSx = {
  fontSize: '0.62rem',
  lineHeight: 1.3,
  color: 'text.secondary',
};

const diceSx = {
  mt: 0.75,
  pt: 0.5,
  borderTop: '1px solid',
  borderColor: 'divider',
  fontSize: '0.66rem',
  color: 'text.secondary',
};

const emptySx = {
  fontSize: '0.74rem',
  fontStyle: 'italic',
  color: 'text.secondary',
};

const followUpSx = {
  textTransform: 'none',
};

const historySx = {
  p: 1.25,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};

const historyTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const historyNoteSx = {
  fontSize: '0.68rem',
  color: 'text.secondary',
  flexGrow: 1,
};

const historyListSx = {
  listStyle: 'none',
  m: 0,
  mt: 0.75,
  p: 0,
};

const historyRowSx = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  columnGap: 0.75,
  rowGap: 0.3,
  py: 0.5,
};

const historyTableSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.64rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  minWidth: 104,
};

const historyDetailSx = {
  fontSize: '0.76rem',
  color: 'text.primary',
};
