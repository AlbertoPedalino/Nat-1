import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import InlineText from './InlineText.jsx';
import { UI_COLORS } from '../ui/colors.js';
import { RULE_INSET_SX, RULE_INSET_TITLE_SX, RULE_LIST_SX, RULE_TABLE_SX } from '../ui/ruleText.js';

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
      <Box component="ul" sx={[RULE_LIST_SX, { my: 0.75 }]}>
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
      <Table size="small" sx={[RULE_TABLE_SX, { my: 1, border: '1px solid', borderColor: UI_COLORS.edge }]}>
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
  // A boxed text (a read-aloud, a sidebar): the rulebook's paper (ruleText.js).
  if (entries.type === 'insetReadaloud' || entries.type === 'inset') {
    return (
      <Box sx={[RULE_INSET_SX, { my: 1 }]}>
        {entries.name ? <Typography sx={RULE_INSET_TITLE_SX}>{entries.name}</Typography> : null}
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
