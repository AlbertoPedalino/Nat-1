import SearchField from '../../../shared/ui/SearchField.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

// Compact controlled search field shared by the builder selection panels
// (feats, fighting styles, weapon mastery, skills, ...).
export default function SelectionSearch({ value, onChange, placeholder = 'Search…' }) {
  return (
    <SearchField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      iconSize={15}
      sx={{ '& .MuiInputBase-input': { fontSize: FONT_SIZES.xl, py: 0.55 } }}
    />
  );
}
