import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';

// The row of keys that picks one item of the inventory (the weapon True Strike
// is cast through, the item an Arcane Firearm is carved on), from
// itemPickOptions: one key per item, lit on the one picked; with no item to
// pick, the line that says so. The same look wherever an item is picked.
export default function ItemPickToggle({ options, value, onChange, emptyText, allowClear = false, disabled = false }) {
  if (!options.length) return <EmptyLine>{emptyText}</EmptyLine>;
  return (
    <ChoiceToggle
      size="xs"
      wrap
      stopPropagation
      allowClear={allowClear}
      disabled={disabled}
      value={value}
      onChange={onChange}
      options={options.map(({ key, label }) => ({ value: key, label }))}
    />
  );
}
