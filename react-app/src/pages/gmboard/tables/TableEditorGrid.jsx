import { useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, useTheme } from '@mui/material';
import { resolveCellCommit } from './tableEdit.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { focusRingSx } from '../../../shared/ui/interactive.js';
import { INK_EDGE } from '../../../shared/ui/shadows.js';

export default function TableEditorGrid({ rows, columns, matchField, onEdit, tableLabel }) {
  const theme = useTheme();
  const [drafts, setDrafts] = useState({});

  const draftKey = (matchValue, field) => `${matchValue}:${field}`;

  const commitNumeric = (matchValue, field, previous) => {
    const key = draftKey(matchValue, field);
    const draft = drafts[key];
    if (draft === undefined) return;
    const { value, valid } = resolveCellCommit(draft, { numeric: true, previous });
    if (valid) onEdit(matchValue, field, value);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const containerSx = {
    border: INK_EDGE,
    borderRadius: 2,
    ...focusRingSx({ inset: true }),
  };

  return (
    <TableContainer
      role="region"
      tabIndex={0}
      aria-label={tableLabel ? `${tableLabel}, scrollable` : 'Table editor'}
      sx={containerSx}
    >
      <Table size="small" sx={{ '& td, & th': { borderColor: theme.palette.gmboard.rowDivider } }}>
        {tableLabel ? <Box component="caption" sx={visuallyHiddenSx}>{tableLabel}</Box> : null}
        <TableHead>
          <TableRow sx={{ bgcolor: theme.palette.gmboard.headerOverlay }}>
            {columns.map((col) => (
              <TableCell key={col.field} scope="col" sx={headCellSx}>{col.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row[matchField]}>
              {columns.map((col, colIndex) => {
                const key = draftKey(row[matchField], col.field);
                const displayValue = col.numeric && drafts[key] !== undefined
                  ? drafts[key]
                  : row[col.field] ?? '';
                const isRowHeader = colIndex === 0;
                const cellLabel = tableLabel ? `${tableLabel} — ${col.label}, row ${row[matchField]}` : `${col.label}, row ${row[matchField]}`;
                return (
                  <TableCell
                    key={col.field}
                    component={isRowHeader ? 'th' : 'td'}
                    scope={isRowHeader ? 'row' : undefined}
                    sx={bodyCellSx}
                  >
                    <TextField
                      size="small"
                      variant="standard"
                      fullWidth
                      type="text"
                      disabled={!col.editable}
                      value={displayValue}
                      onChange={(e) => {
                        if (col.numeric) {
                          setDrafts((prev) => ({ ...prev, [key]: e.target.value }));
                        } else {
                          onEdit(row[matchField], col.field, e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (col.numeric) commitNumeric(row[matchField], col.field, row[col.field]);
                      }}
                      onKeyDown={(e) => {
                        if (col.numeric && e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
                      sx={cellInputSx}
                      slotProps={{
                        htmlInput: {
                          'aria-label': cellLabel,
                          inputMode: col.numeric ? 'numeric' : undefined,
                        },
                      }}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const visuallyHiddenSx = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const headCellSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.sm,
  color: 'text.secondary',
  py: 0.75,
};

const bodyCellSx = {
  py: 0.5,
};

const cellInputSx = {
  '& .MuiInputBase-input': {
    fontSize: FONT_SIZES.lg,
  },
};
