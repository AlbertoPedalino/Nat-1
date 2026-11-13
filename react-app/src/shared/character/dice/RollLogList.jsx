import { Box, Stack, Typography } from '@mui/material';
import RollActorLabel from './RollActorLabel.jsx';
import RollCalculation from './RollCalculation.jsx';
import { rollOutcome } from './rollLogPresentation.js';
import { formatClockTime } from '../../ui/dateFormat.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { SURFACES } from '../../ui/surfaces.js';
import { ROLL_KIND_TONES } from '../../ui/entityColors.js';
import EmptyLine from '../../ui/EmptyLine.jsx';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import ClearButton from '../../ui/ClearButton.jsx';

// The roll log every screen shows (character sheet, battle map, encounter
// builder): newest first, one row per roll in the shape rollFeed.normalizeRoll
// gives — who rolled, what, the dice and total, a note, the time. Kept in
// memory only, and the list says so.
export default function RollLogList({
  log, onClear, emptyText = 'No rolls yet. Rolls made in this campaign show up here.',
}) {
  return (
    <Stack spacing={0.75}>
      {onClear && log?.length ? (
        <ClearButton onClick={onClear} sx={{ alignSelf: 'flex-end' }} />
      ) : null}
      {log?.length ? log.map((entry) => <RollLogRow key={entry.id} entry={entry} />) : (
        <EmptyLine>{emptyText}</EmptyLine>
      )}
      {log?.length ? (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Kept in memory only — this list is gone on reload.
        </Typography>
      ) : null}
    </Stack>
  );
}

function RollLogRow({ entry }) {
  const { title, rest } = splitTitle(entry.label, entry.detail);
  const outcome = rollOutcome(entry);
  const tone = ROLL_KIND_TONES[entry?.kind];
  return (
    <Box sx={{ ...rowSx, ...(tone ? { borderLeft: `3px solid ${tone}` } : null) }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', minWidth: 0 }}>
        <RollActorLabel entry={entry} />
        <Typography sx={labelSx}>{title}</Typography>
        {entry.visibility === 'gm' ? <Typography sx={tagSx}>GM only</Typography> : null}
        {entry.at ? <Typography sx={timeSx}>{formatClockTime(new Date(entry.at))}</Typography> : null}
      </Stack>
      {outcome.isCrit || outcome.isFail ? (
        <Typography sx={{ ...tagSx, color: outcome.color }}>{outcome.isCrit ? 'NATURAL 20!' : 'NATURAL 1'}</Typography>
      ) : null}
      <RollCalculation entry={entry} />
      {rest ? <Typography sx={detailSx}>{rest}</Typography> : null}
      {entry.note ? <Typography sx={detailSx}>{entry.note}</Typography> : null}
    </Box>
  );
}

// A title that repeats the formula ("Custom Roll 2d6+3") shows the formula once,
// in the calculation; whatever followed it stays as a line of its own.
function splitTitle(label, detail) {
  const formula = String(detail || '').replace(/\s*=\s*\d+$/, '');
  const text = String(label || '');
  const at = formula ? text.toLowerCase().lastIndexOf(formula.toLowerCase()) : -1;
  if (at < 0) return { title: text, rest: '' };
  return {
    title: text.slice(0, at).replace(/[\s\-–—(]+$/, ''),
    rest: text.slice(at + formula.length).replace(/^[\s)]+/, '').trim(),
  };
}

const rowSx = {
  ...SURFACES.wash,
  px: 0.75,
  py: 0.5,
};

const labelSx = {
  ...TEXT_STYLES.title, fontSize: FONT_SIZES.md, color: 'text.primary', minWidth: 0, flex: 1,
};
const tagSx = { fontSize: FONT_SIZES.xxxs, ...TEXT_STYLES.title };
const timeSx = { fontSize: FONT_SIZES.xxs, color: 'text.secondary', flexShrink: 0 };
const detailSx = { fontSize: FONT_SIZES.xs, color: 'text.secondary', lineHeight: LINE_HEIGHTS.normal };
