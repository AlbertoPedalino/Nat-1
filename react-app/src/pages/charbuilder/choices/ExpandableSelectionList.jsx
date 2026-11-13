import { Box, IconButton, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import SelectionSearch from './SelectionSearch.jsx';
import { useOptionSearch } from '../../../shared/content/searchText.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import { scrollWellSx } from '../../../shared/ui/surfaces.js';
import BuilderBox from '../layout/BuilderBox.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import PickCount from '../../../shared/ui/PickCount.jsx';

export default function ExpandableSelectionList({
  title,
  options,
  selectedCount = 0,
  max = 1,
  onSelect,
  emptyText = 'No options available.',
  maxHeight = 320,
}) {
  const { query, setQuery, showSearch, visibleOptions } = useOptionSearch(options);

  return (
    <BuilderBox
      title={title}
      aside={<PickCount count={selectedCount} max={max} />}
    >

        {showSearch ? <SelectionSearch value={query} onChange={setQuery} /> : null}

        {!options.length ? (
          <EmptyLine>{emptyText}</EmptyLine>
        ) : !visibleOptions.length ? (
          <EmptyLine>No matches.</EmptyLine>
        ) : (
          <Box sx={scrollWellSx(maxHeight)}>
            <List dense disablePadding>
              {visibleOptions.map((option) => (
                <ExpandableCard
                  key={option.key ?? option.value}
                  details={option.details}
                  containerSx={{ ...LIST_ROW_RULE_SX }}
                  detailsSx={{ px: 1, py: 1, bgcolor: 'background.paper' }}
                  summary={({ open, toggle, disabled }) => (
                    <Stack direction="row" sx={{ alignItems: 'stretch', minWidth: 0 }}>
                      <ListItemButton
                        selected={option.selected}
                        disabled={option.disabled}
                        alignItems="flex-start"
                        onClick={() => onSelect(option)}
                        sx={{ flex: 1, minWidth: 0, px: 1, py: 0.75 }}
                      >
                        <ListItemText
                          primary={(
                            <Typography
                              noWrap
                              sx={BUILDER_TEXT.itemName}
                            >
                              {option.label}
                            </Typography>
                          )}
                          secondary={option.secondary || null}
                          slotProps={{ secondary: {
                            noWrap: true,
                            sx: { ...BUILDER_TEXT.itemMeta, mt: 0.25 },
                          } }}
                        />
                      </ListItemButton>
                      <IconButton
                        size="small"
                        disabled={disabled}
                        aria-label={open ? `Collapse ${option.label}` : `Expand ${option.label}`}
                        onClick={toggle}
                        sx={{ borderRadius: 0, px: 1, color: 'text.secondary' }}
                      >
                        {open ? <ChevronUp size={ICON_SIZES.md} /> : <ChevronDown size={ICON_SIZES.md} />}
                      </IconButton>
                    </Stack>
                  )}
                />
              ))}
            </List>
          </Box>
        )}
    </BuilderBox>
  );
}
