import type { IsoDate, YearMonth } from "./types";

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isYearMonth(value: string): boolean {
  return YEAR_MONTH.test(value);
}

/** Soma `n` meses a "AAAA-MM". */
export function addMonths(month: YearMonth, n: number): YearMonth {
  const match = YEAR_MONTH.exec(month);
  if (!match) throw new Error(`Mês inválido: ${month}`);
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + n;
  const year = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${year}-${String(m).padStart(2, "0")}`;
}

/** Compara dois "AAAA-MM": negativo se a < b, zero se iguais, positivo se a > b. */
export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function dayOf(month: YearMonth, day: number): IsoDate {
  return `${month}-${String(day).padStart(2, "0")}`;
}
