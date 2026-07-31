export const MONTH_NAMES = Object.freeze([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]);

const DAYS_IN_MONTH = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month, year) {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

export function advanceMinutes({ min, day, month, year }, hours) {
  const addedMinutes = hours * 60;
  const nextTotal = min + addedMinutes;
  const dayDelta = Math.floor(nextTotal / 1440) - Math.floor(min / 1440);
  let nextDay = day;
  let nextMonth = month;
  let nextYear = year;
  if (dayDelta > 0) {
    nextDay += dayDelta;
    while (nextDay > daysInMonth(nextMonth, nextYear)) {
      nextDay -= daysInMonth(nextMonth, nextYear);
      nextMonth += 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
    }
  }
  return { min: ((nextTotal % 1440) + 1440) % 1440, day: nextDay, month: nextMonth, year: nextYear };
}

export function formatHM(minutes) {
  const rounded = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDate({ day, month, year }) {
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatDateTime(time) {
  return `${formatDate(time)} — ${formatHM(time.min)}`;
}

export function parseHM(value) {
  const parts = String(value || '').trim().split(':');
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function validateStart({ day, month, year, time }) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const min = parseHM(time);
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(m, y)) return null;
  if (min == null) return null;
  return { day: d, month: m, year: y, min };
}
