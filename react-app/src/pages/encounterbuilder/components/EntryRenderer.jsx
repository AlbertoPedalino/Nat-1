import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import InlineText from './InlineText.jsx';

export default function EntryRenderer({ entries, onRoll }) {
  if (entries == null) return null;
  if (typeof entries === 'string' || typeof entries === 'number') {
    return <InlineText value={entries} onRoll={onRoll} />;
  }
  if (Array.isArray(entries)) {
    return (
      <>
        {entries.map((entry, index) => (
          <Box component="span" key={index}>
            <EntryRenderer entries={entry} onRoll={onRoll} />{index < entries.length - 1 ? ' ' : ''}
          </Box>
        ))}
      </>
    );
  }
  if (typeof entries !== 'object') return null;

  if (entries.type === 'list') {
    return (
      <Box component="ul" sx={{ my: 0.75, pl: 3 }}>
        {(entries.items || []).map((item, index) => (
          <li key={index}><EntryRenderer entries={item} onRoll={onRoll} /></li>
        ))}
      </Box>
    );
  }
  if (entries.type === 'item') {
    const body = entries.entry != null ? entries.entry : entries.entries;
    return (
      <>
        {entries.name ? <Box component="b"><Box component="i"><InlineText value={`${entries.name}. `} onRoll={onRoll} /></Box></Box> : null}
        <EntryRenderer entries={body} onRoll={onRoll} />
      </>
    );
  }
  if (entries.type === 'table') {
    return (
      <Table size="small" sx={{ my: 1, border: '1px solid', borderColor: 'divider' }}>
        {entries.caption ? <caption><InlineText value={entries.caption} onRoll={onRoll} /></caption> : null}
        {entries.colLabels ? (
          <TableHead>
            <TableRow>
              {entries.colLabels.map((label, index) => (
                <TableCell key={index}><InlineText value={label} onRoll={onRoll} /></TableCell>
              ))}
            </TableRow>
          </TableHead>
        ) : null}
        <TableBody>
          {(entries.rows || []).map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}><EntryRenderer entries={cell} onRoll={onRoll} /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  if (entries.type === 'insetReadaloud') {
    return (
      <Box sx={{ my: 1, p: 1, borderLeft: '3px solid', borderColor: 'primary.main', bgcolor: 'rgba(215,173,82,0.08)', fontStyle: 'italic' }}>
        <EntryRenderer entries={entries.entries} onRoll={onRoll} />
      </Box>
    );
  }
  if (entries.name && entries.entries) {
    return (
      <Typography component="div" variant="body2" sx={{ mb: 0.75 }}>
        <Box component="b"><Box component="i"><InlineText value={`${entries.name}. `} onRoll={onRoll} /></Box></Box>
        <EntryRenderer entries={entries.entries} onRoll={onRoll} />
      </Typography>
    );
  }
  if (entries.entry != null) return <EntryRenderer entries={entries.entry} onRoll={onRoll} />;
  if (entries.entries) return <EntryRenderer entries={entries.entries} onRoll={onRoll} />;
  return null;
}
