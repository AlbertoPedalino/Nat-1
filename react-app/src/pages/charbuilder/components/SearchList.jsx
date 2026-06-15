import { Chip, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import SharedSearchField from '../../../shared/character/SearchField.jsx';

export function SearchField({ value, onChange, placeholder }) {
  return (
    <SharedSearchField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size="medium"
      iconSize={14}
    />
  );
}

export default function SearchList({ value, onSearch, placeholder, items, selectedName, onSelect, meta }) {
  return (
    <Stack spacing={0.65}>
      <SearchField
        value={value}
        placeholder={placeholder}
        onChange={onSearch}
      />
      <Paper variant="outlined" sx={{ maxHeight: 390, overflow: 'auto' }}>
        <List dense disablePadding>
          {items.map((item) => {
            const selected = selectedName === item.name;
            return (
              <ListItemButton
                key={`${item.name}-${item.source}`}
                selected={selected}
                divider
                onClick={() => onSelect(item)}
                sx={{ alignItems: 'flex-start', gap: 1, py: 0.55 }}
              >
                <ListItemText
                  primary={<Typography fontWeight={500} sx={{ fontSize: '0.76rem' }}>{item.name}</Typography>}
                  secondary={meta?.(item)}
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <Chip size="small" label={item.source} />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>
    </Stack>
  );
}
