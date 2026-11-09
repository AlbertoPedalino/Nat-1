import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { CornerDownRight, Dices, History, Trash2 } from 'lucide-react';
import ResultBadge from '../../../shared/gmboard/ui/ResultBadge.jsx';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import { boardTone, complicationVisual, eventVisual } from '../../../shared/gmboard/ui/resultVisuals.js';
import { diceText } from '../../../shared/gmboard/resultText.js';
import { ROLL_TABLES, describeRoll, followUpTables, summarizeStats } from './rollTable.js';
import { TABLE_ICONS } from './tableCatalog.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import BoardPanel from '../ui/BoardPanel.jsx';
import { ResultCard, ResultSlot, resultDetailSx } from '../ui/ResultCard.jsx';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { boardCardGridSx, boardInsetSx } from '../../../shared/gmboard/ui/surfaces.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

const TABLE_LABEL = Object.fromEntries(ROLL_TABLES.map((table) => [table.id, table.label]));

function rollTone(roll, palette) {
  switch (roll.tableId) {
    case 'event': return boardTone(palette, 'result', eventVisual(roll.data).tone);
    case 'encounter': return boardTone(palette, 'difficulty', roll.data.diff);
    case 'loot': return boardTone(palette, 'rarity', roll.data.rarity);
    case 'trap': return palette.gmboard.result.trap;
    case 'compl': return boardTone(palette, 'result', complicationVisual(roll.data.type).tone);
    case 'env': return boardTone(palette, 'rarity', roll.data.severity);
    default: return palette.gmboard.result.none;
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
  const Icon = TABLE_ICONS[table.id];
  const tone = roll ? rollTone(roll, theme.palette) : null;
  const described = roll ? describeRoll(roll) : null;
  const followUps = roll ? followUpTables(roll) : [];

  return (
    <ResultCard
      icon={Icon}
      title={table.label}
      highlighted={latest}
      spacing={1}
      headerSx={headerBandSx}
      header={(
        <>
          <Typography sx={resultDetailSx}>{table.dice}</Typography>
          {table.tiered ? <ResultBadge tone={theme.palette.gmboard.tier[tier].color}>T{tier}</ResultBadge> : null}
        </>
      )}
    >
      <Box aria-live="polite" sx={resultAreaSx}>
        {roll ? (
          <ResultSlot tone={tone}>
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
              Table roll: {diceText(roll)}{roll.tier && roll.tier !== tier ? ` · rolled at T${roll.tier}` : ''}
            </Typography>
          </ResultSlot>
        ) : (
          <Typography sx={emptySx}>Not rolled yet.</Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.75} sx={wrapRowSx}>
        <Button
          size="small"
          variant="contained"
          startIcon={<Dices size={ICON_SIZES.sm} />}
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
            startIcon={<CornerDownRight size={ICON_SIZES.xs} />}
            aria-label={`Then roll ${TABLE_LABEL[id]}`}
            onClick={() => onRoll(id)}
            sx={followUpSx}
          >
            {TABLE_LABEL[id]}
          </Button>
        ))}
      </Stack>
    </ResultCard>
  );
}

function HistoryRow({ roll, last }) {
  const theme = useTheme();
  const Icon = TABLE_ICONS[roll.tableId];
  const tone = rollTone(roll, theme.palette);
  const { title, stats } = describeRoll(roll);
  const detail = summarizeStats(stats);

  return (
    <Box component="li" sx={{ ...historyRowSx, borderBottom: last ? 'none' : '1px solid', borderColor: 'divider' }}>
      <Icon size={ICON_SIZES.xs} color={theme.palette.text.secondary} />
      <Typography sx={historyTableSx}>
        {TABLE_LABEL[roll.tableId]}{roll.tier ? ` T${roll.tier}` : ''}
      </Typography>
      <ResultBadge tone={tone}>{title}</ResultBadge>
      {detail ? <Typography sx={historyDetailSx}>{detail}</Typography> : null}
      <Typography sx={resultDetailSx}>{diceText(roll)}</Typography>
    </Box>
  );
}

export default function RollView() {
  const { state, dispatch, rollOnTable } = useGmBoard();
  const theme = useTheme();
  const { rolls, rollTier } = state;

  return (
    <Stack spacing={2}>
      <BoardPanel icon={Dices} title="Table Roller">
        <TierSelector
          label="Tier — Encounter and Trap"
          value={rollTier}
          onChange={(tier) => dispatch({ type: 'setRollTier', tier })}
        />
        <Typography sx={hintSx}>
          One roll on one table. Nothing here moves the clock, the weather or the session log.
        </Typography>
      </BoardPanel>

      <Box sx={boardCardGridSx}>
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
          <History size={ICON_SIZES.xs} color={theme.palette.text.secondary} />
          <Typography sx={historyTitleSx}>Roll History</Typography>
          <Typography sx={historyNoteSx}>Kept until this page is reloaded.</Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={ICON_SIZES.xs} />}
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

const hintSx = {
  fontSize: FONT_SIZES.md,
  color: 'text.secondary',
};

// A fixed height, so the cards with a tier badge line up with the ones without.
const headerBandSx = {
  minHeight: 36,
};

const wrapRowSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
  rowGap: 0.5,
};

// Tall enough for one row of fields and the dice line, so a card does not jump
// from one roll to the next.
const resultAreaSx = {
  minHeight: 96,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
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
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxs,
  color: 'text.secondary',
  lineHeight: LINE_HEIGHTS.normal,
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
  fontSize: FONT_SIZES.body,
  lineHeight: LINE_HEIGHTS.normal,
  color: 'text.primary',
};

const statEmphasisSx = {
  ...statValueSx,
  fontWeight: FONT_WEIGHTS.bold,
  color: 'primary.main',
};

const statNoteSx = {
  fontSize: FONT_SIZES.xs,
  lineHeight: LINE_HEIGHTS.snug,
  color: 'text.secondary',
};

const diceSx = {
  mt: 0.75,
  pt: 0.5,
  borderTop: '1px solid',
  borderColor: 'divider',
  fontSize: FONT_SIZES.sm,
  color: 'text.secondary',
};

const emptySx = {
  ...TEXT_STYLES.note, fontSize: FONT_SIZES.md,
  
};

const followUpSx = {
  textTransform: 'none',
};

const historySx = boardInsetSx;

const historyTitleSx = captionLabelSx;

const historyNoteSx = {
  fontSize: FONT_SIZES.sm,
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
  rowGap: 0.25,
  py: 0.5,
};

const historyTableSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  color: 'text.secondary',
  minWidth: 104,
};

const historyDetailSx = {
  fontSize: FONT_SIZES.lg,
  color: 'text.primary',
};
