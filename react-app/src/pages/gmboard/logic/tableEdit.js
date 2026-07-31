export function resolveCellCommit(raw, { numeric, previous }) {
  if (!numeric) return { value: raw, valid: true };
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '') return { value: previous, valid: false };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { value: previous, valid: false };
  return { value: parsed, valid: true };
}
