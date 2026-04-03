export function countDaysExcludingSundays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    if (current.getDay() !== 0) count += 1;
  }

  return count;
}

export function countCalendarDaysInclusive(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}
