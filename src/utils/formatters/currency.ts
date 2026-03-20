/**
 * Formata entrada monetária para padrão brasileiro sem separador de milhar
 * Exemplos: "1" -> "0,01", "1234" -> "12,34"
 */
export function formatCurrencyInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return '0,00';

  const normalized = digitsOnly.padStart(3, '0');
  const integerPart = normalized.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const decimalPart = normalized.slice(-2);

  return `${integerPart},${decimalPart}`;
}

/**
 * Converte valor no formato brasileiro para número decimal
 * Exemplo: "12,34" -> 12.34
 */
export function parseCurrencyInput(value: string): number {
  const [integerPart = '0', decimalPart = '00'] = value.split(',');
  const integerDigits = integerPart.replace(/\D/g, '') || '0';
  const decimalDigits = decimalPart.replace(/\D/g, '').padEnd(2, '0').slice(0, 2);

  return Number(`${integerDigits}.${decimalDigits}`);
}

const CURRENCY_FORMATTER_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formata número para moeda BRL com separador de milhar
 * Exemplo: 1234.56 -> R$ 1.234,56
 */
export function formatCurrencyBRL(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return CURRENCY_FORMATTER_BRL.format(safeValue);
}

/**
 * Formata número para percentual no padrão brasileiro
 * Exemplo: 12.5 -> 12,50%
 */
export function formatPercentBRL(value: number, fractionDigits = 2): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue.toFixed(fractionDigits).replace('.', ',')}%`;
}
