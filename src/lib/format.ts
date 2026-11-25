/** R$ 1.234,56 */
export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** R$ 1.235 (sem centavos, para totais grandes). */
export const brlRound = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** "2027-03" → "Mar 27" */
export const monthLabel = (month: string) =>
  `${MONTHS.at(Number(month.slice(5)) - 1)} ${month.slice(2, 4)}`;
