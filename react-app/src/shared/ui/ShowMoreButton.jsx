import { Box, Button } from '@mui/material';
import { formatNumber } from './numberFormat.js';

// The row under a list paged by usePagedList: "Show more (N)", centred,
// nothing once every row is shown. `page` is the hook's result.
export default function ShowMoreButton({ page, sx }) {
  if (!(page?.remaining > 0)) return null;
  return (
    <Box sx={[{ display: 'flex', justifyContent: 'center', py: 0.5 }, sx]}>
      <Button size="small" variant="outlined" onClick={page.showMore}>
        Show more ({formatNumber(page.remaining)})
      </Button>
    </Box>
  );
}
