import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { loadRollTable, rollOnTable } from '../../../shared/character/dice/rollTables.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { UI_COLORS, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { useLoaded } from '../../../shared/ui/useLoaded.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import DetailPanel from '../layout/DetailPanel.jsx';

// The card of a feature that rolls on a table of the game data (Wild Magic
// Surge): its adapter names the table (`rollTable.key`, rollTables.js) and,
// when a later feature lets it roll twice and pick (Controlled Chaos), from
// which owner level (`rollTable.twice`). The rules text is the card's own,
// from the data; the table that cannot be loaded leaves the panel out.
export default function RollTablePanel({ action }) {
  const { onShowToast } = useSheetActions();
  const [result, setResult] = useState(null);
  const config = action?.rollTable || {};
  const table = useLoaded(() => (config.key ? loadRollTable(config.key) : null), [config.key]).data;
  if (!table) return null;

  const twice = config.twice && Number(action?.ownerLevel || 0) >= Number(config.twice.fromLevel)
    ? config.twice
    : null;

  const roll = (e) => {
    e?.stopPropagation?.();
    const out = rollOnTable(table, { count: twice ? 2 : 1 });
    setResult(out);
    const lines = out.rolls.map((r, i) => `${twice ? `#${i + 1} ` : ''}[${r.range}] ${r.effect}`).join('\n');
    onShowToast?.(
      table.name,
      twice ? `${lines}\nChoose one.` : lines,
      twice ? 0 : out.rolls[0].value,
      out.rolls.map((r) => ({ v: r.value, faces: r.faces })),
    );
  };

  return (
    <DetailPanel title={table.name}>
      <Button size="small" variant="outlined" onClick={roll}>
        {twice ? `Roll Twice (${twice.feature})` : `Roll d${table.sides}`}
      </Button>
      {result ? (
        <Box sx={{ mt: 0.5, p: 0.5, borderRadius: 1, ...tintedSurfaceSx(UI_COLORS.accentText, { amount: OPACITY.wash }) }}>
          {twice ? (
            <Typography sx={{ fontSize: FONT_SIZES.sm, color: UI_COLORS.accentText, fontWeight: FONT_WEIGHTS.bold, mb: 0.25 }}>
              Choose one:
            </Typography>
          ) : null}
          {result.rolls.map((r, i) => (
            <Typography key={i} sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', mb: 0.25 }}>
              {twice ? `#${i + 1} ` : `d${table.sides}: ${r.value} `}[{r.range}] {r.effect}
            </Typography>
          ))}
        </Box>
      ) : null}
    </DetailPanel>
  );
}
