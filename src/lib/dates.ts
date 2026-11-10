export function dayRangeInTz(isoDate: string, timeZone: string): { from: Date; to: Date } {
  const utcMidnight = new Date(`${isoDate}T00:00:00.000Z`);
  const offsetMs = tzOffsetMs(utcMidnight, timeZone);
  const from = new Date(utcMidnight.getTime() - offsetMs);
  const nextUtcMidnight = new Date(utcMidnight.getTime() + 86_400_000);
  const to = new Date(nextUtcMidnight.getTime() - tzOffsetMs(nextUtcMidnight, timeZone));
  return { from, to };
}

function tzOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - at.getTime();
}

export function dateInTz(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(at);
}

export function todayInTz(timeZone: string): string {
  return dateInTz(new Date(), timeZone);
}
