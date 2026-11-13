import { useCallback, useState } from 'react';
import { Box } from '@mui/material';
import { Plus } from 'lucide-react';
import { ItemAddRow } from '../../../shared/character/inventory/ItemReference.jsx';
import ItemBrowser, { ItemListSection } from '../../../shared/character/inventory/ItemBrowser.jsx';
import DisclosureButton from '../../../shared/ui/DisclosureButton.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import CardSection from '../../../shared/ui/CardSection.jsx';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';
import AddButton from '../../../shared/ui/AddButton.jsx';

// The item database renders in pages instead of hard-capping: a broad filter
// can legitimately match most of it (~2500 entries once magic variants are
// expanded), and truncating made it look like the filter had only searched the
// first alphabetical slice. 120 rows a page: the old hard cap rendered that
// many at once, so the DOM cost is known to be fine.
const SEARCH_PAGE = 120;

// The "Add Item" section: the item database (ItemBrowser, as every item list)
// and the way to make up an item of your own (`onCreateCustom` opens
// CustomItemDialog). Its search and filters are its own, so narrowing them
// never hides rows of the inventory list below. It stays mounted while
// collapsed, keeping what was typed.
export default function InventoryAddPanel({ itemsDb, onAddItem, onCreateCustom }) {
  const search = useState('');
  const chips = useState([]);
  const [open, setOpen] = useState(false);
  const renderRows = useCallback((visible) => visible.map((item) => (
    <ItemAddRow key={`${item.name}-${item.source}`} item={item} onAdd={onAddItem} />
  )), [onAddItem]);

  return (
    <ItemListSection
      sx={{ mb: 1 }}
      head={(
        <Box>
          <DisclosureButton
            open={open}
            onToggle={() => setOpen((prev) => !prev)}
            icon={open ? null : <Plus size={ICON_SIZES.xs} />}
            label={open ? 'Close' : 'Add Item'}
          />
        </Box>
      )}
    >
      <CollapsibleBody open={open}>
        <CardSection>
          <ItemBrowser
            entries={itemsDb}
            search={search}
            chips={chips}
            order="search"
            pageSize={SEARCH_PAGE}
            renderRows={renderRows}
            empty={<LoadingLine label="Loading items…" sx={{ px: 1, py: 1.25 }} />}
          />
          <AddButton onClick={onCreateCustom} sx={{ mt: 0.75 }}>Custom item</AddButton>
        </CardSection>
      </CollapsibleBody>
    </ItemListSection>
  );
}
