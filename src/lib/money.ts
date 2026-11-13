export function formatPaise(paise: number | null | undefined): string {
  if (paise == null || Number.isNaN(paise)) return '—';
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}₹${whole.toLocaleString('en-IN')}.${frac}`;
}

export function rupeesToPaise(input: string): number {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('Enter an amount like 1500 or 1500.50');
  }
  const [whole, frac = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

export function paiseToRupeesInput(paise: number): string {
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}
