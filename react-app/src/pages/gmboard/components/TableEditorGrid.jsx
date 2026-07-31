import { useState } from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, useTheme } from '@mui/material';
import { resolveCellCommit } from '../logic/tableEdit.js';

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
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '-2px',
    },
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
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.66rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  py: 0.75,
};

const bodyCellSx = {
  py: 0.5,
};

const cellInputSx = {
  '& .MuiInputBase-input': {
    fontSize: '0.76rem',
  },
};
