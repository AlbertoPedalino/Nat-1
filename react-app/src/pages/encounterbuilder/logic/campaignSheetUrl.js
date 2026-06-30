export function campaignSheetUrl(id) {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}/campaign-sheet?id=${encodeURIComponent(id)}&edit=1`;
}
