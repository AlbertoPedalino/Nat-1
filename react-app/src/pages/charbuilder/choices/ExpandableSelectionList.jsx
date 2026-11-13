import { Box, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { useOptionSearch } from '../../../shared/content/searchText.js';
import { BUILDER_TEXT } from '../layout/builderText.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import { scrollWellSx } from '../../../shared/ui/surfaces.js';
import BuilderBox from '../layout/BuilderBox.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import PickCount from '../../../shared/ui/PickCount.jsx';
import RowExpandButton from '../../../shared/ui/RowExpandButton.jsx';
import SearchField from '../../../shared/ui/SearchField.jsx';

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

        {showSearch ? <SearchField density="compact" value={query} onChange={setQuery} /> : null}

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
                      <RowExpandButton open={open} onToggle={toggle} label={option.label} disabled={disabled} />
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
