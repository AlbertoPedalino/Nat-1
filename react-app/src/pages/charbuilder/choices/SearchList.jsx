import { Box, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { scrollWellSx } from '../../../shared/ui/surfaces.js';
import SelectionSearch from './SelectionSearch.jsx';

export default function SearchList({ value, onSearch, placeholder, items, selectedName, onSelect, meta }) {
  return (
    <Stack spacing={0.75}>
      <SelectionSearch
        value={value}
        placeholder={placeholder}
        onChange={onSearch}
      />
      <Box sx={scrollWellSx(390)}>
        <List dense disablePadding>
          {items.map((item) => {
            const selected = selectedName === item.name;
            return (
              <ListItemButton
                key={`${item.name}-${item.source}`}
                selected={selected}
                divider
                onClick={() => onSelect(item)}
                sx={{ alignItems: 'flex-start', gap: 1, py: 0.5 }}
              >
                <ListItemText
                  primary={<Typography sx={BUILDER_TEXT.itemName}>{item.name}</Typography>}
                  secondary={meta?.(item)}
                  slotProps={{ secondary: { component: 'div' } }}
                />
                <MiniBadge label={item.source} color={UI_COLORS.textSecondary} />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Stack>
  );
}
