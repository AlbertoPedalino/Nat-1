import SearchField from '../../../shared/character/SearchField.jsx';

// Text-search utils + the useOptionSearch hook now live in
// shared/character/searchText.js (app-wide). This file is the builder-styled
// wrapper only.

// Compact controlled search field shared by the builder selection panels
// (feats, fighting styles, weapon mastery, skills, ...).
export default function SelectionSearch({ value, onChange, placeholder = 'Search…' }) {
  return (
    <SearchField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      iconSize={15}
      sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.55 } }}
    />
  );
}
