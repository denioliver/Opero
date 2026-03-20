const DATE_FORMATTER_BRL = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATETIME_FORMATTER_BRL = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function parseUnknownDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const converted = (value as { toDate: () => unknown }).toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime())
      ? converted
      : null;
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateBRL(value: unknown, fallback = '—'): string {
  const parsed = parseUnknownDate(value);
  return parsed ? DATE_FORMATTER_BRL.format(parsed) : fallback;
}

export function formatDateTimeBRL(value: unknown, fallback = '—'): string {
  const parsed = parseUnknownDate(value);
  return parsed ? DATETIME_FORMATTER_BRL.format(parsed) : fallback;
}
