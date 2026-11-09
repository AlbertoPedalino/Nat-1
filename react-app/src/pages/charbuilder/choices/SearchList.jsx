import { Chip, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

export default function SearchList({ value, onSearch, placeholder, items, selectedName, onSelect, meta }) {
  return (
    <Stack spacing={0.65}>
      <SearchField
        value={value}
        placeholder={placeholder}
        onChange={onSearch}
        size="medium"
        iconSize={14}
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
                  primary={<Typography sx={{ fontWeight: 500, fontSize: FONT_SIZES.lg }}>{item.name}</Typography>}
                  secondary={meta?.(item)}
                  slotProps={{ secondary: { component: 'div' } }}
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
