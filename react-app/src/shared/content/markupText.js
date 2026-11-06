// 5etools inline markup reduced to the words it shows: "{@item Shield|XPHB}"
// becomes "Shield", "{@skill Stealth}" "Stealth", and a tag with no text
// ("{@hom}") disappears. For labels, keys and search text; the renderers that
// turn tags into rolls, links and stat-block labels live in entryText.js and
// statBlockTags.js.
export function stripMarkup(value) {
  return String(value ?? '')
    .replace(/\{@\w+\s+([^|}]*)(?:\|[^}]*)?\}/g, '$1')
    .replace(/\{@\w+\}/g, '');
}
