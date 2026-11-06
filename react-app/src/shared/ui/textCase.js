// How a name is capitalized for display, the same way everywhere.

// First letter upper case, the rest as it is: "beast" -> "Beast".
export function capitalize(value) {
  const text = String(value ?? '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Every word capitalized, underscores read as spaces; a hyphenated word is
// capitalized on both sides and an apostrophe does not start a word:
// "thieves' tools" -> "Thieves' Tools", "half-elf" -> "Half-Elf",
// "animal_handling" -> "Animal Handling". The rest of each word is kept.
export function titleCase(value) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/(^|[\s-])([a-z])/g, (_, before, letter) => before + letter.toUpperCase());
}
