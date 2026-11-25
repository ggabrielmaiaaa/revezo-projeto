/** Mês no formato "AAAA-MM", ex.: "2027-01". */
export type YearMonth = string;

/** Data no formato "AAAA-MM-DD". */
export type IsoDate = string;

/** Por onde o usuário paga o serviço. Define onde ele precisa cancelar. */
export type BillingChannel = "direct" | "apple" | "google" | "carrier" | "other";

/** Um serviço que o usuário assina (ou quer usar no rodízio). Valores em centavos. */
export interface UserService {
  serviceId: string;
  /** Quanto o usuário paga por mês no plano mensal. */
  monthlyCents: number;
  /** Custo mensal equivalente do plano anual, se existir. */
  annualMonthlyCents?: number | null;
  billing: BillingChannel;
}

/** Algo que o usuário quer ver. */
export interface WatchItem {
  id: string;
  title: string;
  /** Serviços onde o título está disponível. */
  serviceIds: string[];
  /** Horas estimadas para assistir. */
  hours: number;
  /** Mês em que estreia (ou sai temporada nova). Antes disso não dá para assistir. */
  releaseMonth?: YearMonth | null;
  /** Último mês em que fica no catálogo. Depois disso não dá para assistir. */
  leavingMonth?: YearMonth | null;
}

export interface RotationOptions {
  /** Primeiro mês do plano. */
  startMonth: YearMonth;
  /** Quantos meses planejar (padrão 12). */
  months?: number;
  /** Quantos serviços do rodízio ficam ativos ao mesmo tempo (padrão 1). */
  concurrent?: 1 | 2;
  /** Manter no anual os serviços em que o anual sai mais barato (padrão true). */
  useAnnual?: boolean;
  /** Horas que o usuário assiste por mês (padrão 30). */
  hoursPerMonth?: number;
  /** Serviços já pagos por fora do rodízio (ex.: dentro de um pacote). Títulos neles não puxam assinaturas. */
  coveredServiceIds?: string[];
}

export interface RotationInput {
  services: UserService[];
  watchlist: WatchItem[];
  options: RotationOptions;
}

export type MonthReason =
  | { kind: "release"; itemId: string; title: string }
  | { kind: "leaving"; itemId: string; title: string }
  | { kind: "watchlist"; hours: number }
  | { kind: "rotation" };

export interface PlannedMonth {
  month: YearMonth;
  /** Serviços do rodízio ativos neste mês (vazio = mês de pausa). */
  serviceIds: string[];
  reasons: Record<string, MonthReason[]>;
  costCents: number;
}

export interface RotationEvent {
  type: "subscribe" | "cancel";
  serviceId: string;
  date: IsoDate;
  billing: BillingChannel;
}

export interface RotationPlan {
  months: PlannedMonth[];
  /** Serviços mantidos o período todo no plano anual. */
  annualServiceIds: string[];
  /** Serviços mantidos no mensal o período todo (quando não há o que revezar). */
  alwaysOnServiceIds: string[];
  /** Custo de manter tudo no mensal o período todo. */
  baselineCents: number;
  /** Custo do plano. */
  planCents: number;
  savingsCents: number;
  /** Quando assinar e quando cancelar cada serviço do rodízio. */
  events: RotationEvent[];
}
