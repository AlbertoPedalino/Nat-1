import { Chip, InputAdornment, List, ListItemButton, ListItemText, Paper, Stack, TextField, Typography } from '@mui/material';
import { Search } from 'lucide-react';

export function SearchField({ value, onChange, placeholder }) {
  return (
    <TextField
      fullWidth
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ input: {
        startAdornment: (
          <InputAdornment position="start">
            <Search size={14} />
          </InputAdornment>
        ),
      } }}
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
