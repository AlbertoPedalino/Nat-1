export const CURRENCY_TYPES = [
  { key: 'cp', label: 'Copper', shortLabel: 'CP', tone: '#b87333' },
  { key: 'sp', label: 'Silver', shortLabel: 'SP', tone: '#b8b8b8' },
  { key: 'ep', label: 'Electrum', shortLabel: 'EP', tone: '#9f9f9f' },
  { key: 'gp', label: 'Gold', shortLabel: 'GP', tone: '#d7ad52' },
  { key: 'pp', label: 'Platinum', shortLabel: 'PP', tone: '#dde1ff' },
];

export function normalizeCoinAmount(value) {
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function sanitizeCoinInput(value) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');
}
