import { Box, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';

function selectionStatus(selectedCount, max) {
  if (!Number.isFinite(max) || max <= 0) return null;
  return `${selectedCount} / ${max} selected`;
}

export default function ExpandableSelectionList({
  title,
  options,
  selectedCount = 0,
  max = 1,
  onSelect,
  emptyText = 'No options available.',
  maxHeight = 320,
}) {
  const status = selectionStatus(selectedCount, max);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>
            {title}
          </Typography>
          {status ? (
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {status}
            </Typography>
          ) : null}
        </Stack>

        {options.length ? (
          <Paper variant="outlined" sx={{ maxHeight, overflow: 'auto', bgcolor: 'background.default' }}>
            <List dense disablePadding>
              {options.map((option) => (
                <ExpandableCard
                  key={option.key ?? option.value}
                  details={option.details}
                  containerSx={{ borderBottom: 1, borderColor: 'divider' }}
                  detailsSx={{ px: 1, py: 1, bgcolor: 'background.paper' }}
                  summary={({ open, toggle, disabled }) => (
                    <Stack direction="row" alignItems="stretch" sx={{ minWidth: 0 }}>
                      <ListItemButton
                        selected={option.selected}
                        disabled={option.disabled}
                        alignItems="flex-start"
                        onClick={() => onSelect(option)}
                        sx={{ flex: 1, minWidth: 0, px: 1, py: 0.8 }}
                      >
                        <ListItemText
                          primary={(
                            <Typography
                              noWrap
                              sx={{ color: 'text.primary', fontSize: '0.84rem', fontWeight: 500 }}
                            >
                              {option.label}
                            </Typography>
                          )}
                          secondary={option.secondary || null}
                          secondaryTypographyProps={{
                            noWrap: true,
                            sx: { mt: 0.15, fontSize: '0.72rem' },
                          }}
                        />
                      </ListItemButton>
                      <IconButton
                        size="small"
                        disabled={disabled}
                        aria-label={open ? `Collapse ${option.label}` : `Expand ${option.label}`}
                        onClick={toggle}
                        sx={{ borderRadius: 0, px: 1.1, color: 'text.secondary' }}
                      >
                        {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                      </IconButton>
                    </Stack>
                  )}
                />
              ))}
            </List>
          </Paper>
        ) : (
          <Box sx={{ px: 0.25 }}>
            <Typography color="text.secondary">{emptyText}</Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
