import SelectField from '../../../shared/ui/SelectField.jsx';

// Which character's sheet is on show, beside the map (the top bar's Sheet
// switch, the floating sheet's header). Shown only when there is a choice to
// make: several characters, or one while no character is picked because
// something else (a creature's stat block) is on show, as the way back to it.
//
// `choices` are { characterId, name }; `onChange` gets the picked id.
// `native` uses the browser's own list: the floating sheet sits inside the
// map, and a menu is portalled to the page body, which a fullscreen map does
// not paint, while a native list opens over it. The top bar's picker keeps the
// themed menu.
export default function SheetCharacterSelect({ choices, selectedId, onChange, native = false }) {
  const picked = choices.some((entry) => entry.characterId === selectedId);
  if (!(choices.length > 1 || (choices.length && !picked))) return null;
  return (
    <SelectField
      native={native}
      ariaLabel="Character sheet"
      value={picked ? selectedId : ''}
      onChange={onChange}
      placeholder="Character…"
      options={choices.map((entry) => ({ value: entry.characterId, label: entry.name }))}
      fullWidth={false}
      onMap
      sx={selectSx}
    />
  );
}

const selectSx = { width: { xs: 148, sm: 210 } };
