export function partitionNamedEntries(entries) {
  const list = entries == null ? [] : (Array.isArray(entries) ? entries : [entries]);
  const introEntries = [];
  const namedEntries = [];

  list.forEach((entry) => {
    if (entry && typeof entry === 'object' && entry.name) namedEntries.push(entry);
    else introEntries.push(entry);
  });

  return { introEntries, namedEntries };
}

export function splitNamedEntries(entries, introLabel = 'Description') {
  const { introEntries, namedEntries } = partitionNamedEntries(entries);
  return [
    ...(introEntries.length ? [{ name: introLabel, entries: introEntries }] : []),
    ...namedEntries,
  ];
}
