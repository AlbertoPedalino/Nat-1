import SearchField from './SearchField.jsx';
import { useDraftText } from './useDraftText.js';

// A SearchField whose text lives somewhere costly to change (a reducer behind
// a whole page: the character builder, the encounter builder): the field
// follows the typing at once, `onChange` gets the text after a pause or when
// the field is left (useDraftText). Every other SearchField prop passes
// through; density is compact unless given.
export default function DraftSearchField({ value, onChange, density = 'compact', ...props }) {
  const [text, setText, flush] = useDraftText(value, onChange);
  return <SearchField density={density} value={text} onChange={setText} onBlur={flush} {...props} />;
}
