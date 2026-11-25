import { addMonths, compareMonths, dayOf } from "./months";
import type {
  MonthReason,
  PlannedMonth,
  RotationEvent,
  RotationInput,
  RotationPlan,
  UserService,
  WatchItem,
  YearMonth,
} from "./types";

/** Quantas "horas equivalentes" vale uma estreia no mês. Faz o serviço ir para o mês do lançamento. */
const RELEASE_WEIGHT_HOURS = 100;
/** Quantas "horas equivalentes" vale um título que sai do catálogo no mês. */
const LEAVING_WEIGHT_HOURS = 60;

interface Settings {
  totalMonths: number;
  concurrent: number;
  hoursPerMonth: number;
  startMonth: YearMonth;
  coveredServiceIds: readonly string[];
}

interface Candidate {
  service: UserService;
  items: WatchItem[];
  releases: WatchItem[];
  leavings: WatchItem[];
  score: number;
}

/**
 * Monta o plano de rodízio.
 *
 * Regras:
 * 1. Se houver tantos serviços quanto o número ativo ao mesmo tempo (ou menos), não há rodízio:
 *    eles ficam ativos o período todo.
 * 2. Com a lista vazia, os serviços do rodízio revezam em ordem (o menos usado recentemente
 *    primeiro; empate: o mais caro primeiro).
 * 3. Com lista, cada mês fica com o serviço de maior valor por real: horas disponíveis da lista,
 *    mais bônus por estreia e por título saindo do catálogo, dividido pelo preço. Mês sem nada para
 *    ver vira pausa (nenhum serviço do rodízio ativo).
 * 4. Plano anual (se `useAnnual`): um serviço vai para o anual só quando os meses em que ele ficaria
 *    ativo no rodízio custariam mais que o anual no período. O plano é refeito sem ele, até estabilizar.
 */
export function planRotation(input: RotationInput): RotationPlan {
  const { services, watchlist, options } = input;
  const settings: Settings = {
    totalMonths: options.months ?? 12,
    concurrent: options.concurrent ?? 1,
    hoursPerMonth: options.hoursPerMonth ?? 30,
    startMonth: options.startMonth,
    coveredServiceIds: options.coveredServiceIds ?? [],
  };
  const useAnnual = options.useAnnual ?? true;

  const annualIds = new Set<string>();
  for (;;) {
    const plan = buildPlan(services, watchlist, annualIds, settings);
    if (!useAnnual) return plan;

    const activeMonths = (id: string) =>
      plan.alwaysOnServiceIds.includes(id)
        ? settings.totalMonths
        : plan.months.filter((m) => m.serviceIds.includes(id)).length;
    const worthAnnual = services.filter(
      (s) =>
        !annualIds.has(s.serviceId) &&
        s.annualMonthlyCents != null &&
        s.annualMonthlyCents * settings.totalMonths < activeMonths(s.serviceId) * s.monthlyCents,
    );
    if (worthAnnual.length === 0) return plan;
    for (const s of worthAnnual) annualIds.add(s.serviceId);
  }
}

function buildPlan(
  services: UserService[],
  watchlist: WatchItem[],
  annualIds: Set<string>,
  settings: Settings,
): RotationPlan {
  const { totalMonths, concurrent, hoursPerMonth } = settings;
  const annual = services.filter((s) => annualIds.has(s.serviceId));
  let rotating = services.filter((s) => !annualIds.has(s.serviceId));
  let alwaysOn: UserService[] = [];
  if (rotating.length <= concurrent) {
    alwaysOn = rotating;
    rotating = [];
  }

  const baselineCents = sum(services.map((s) => s.monthlyCents)) * totalMonths;
  const fixedMonthlyCents =
    sum(annual.map((s) => s.annualMonthlyCents ?? s.monthlyCents)) +
    sum(alwaysOn.map((s) => s.monthlyCents));

  // Títulos de serviços que ficam ativos o tempo todo (anual, fixo ou dentro de um pacote)
  // são assistidos por lá, fora do rodízio.
  const coveredIds = new Set([
    ...[...annual, ...alwaysOn].map((s) => s.serviceId),
    ...settings.coveredServiceIds,
  ]);
  const pending = watchlist.filter((item) => !item.serviceIds.some((id) => coveredIds.has(id)));
  // Lista vazia = o usuário ainda não disse o que quer ver: reveza tudo em ordem.
  // Lista preenchida = só assina quando há algo para ver; senão, o mês é de pausa.
  const hasDemand = watchlist.length > 0;

  const remaining = new Map(pending.map((item) => [item.id, item.hours]));
  const lastUsed = new Map<string, number>();
  const months: PlannedMonth[] = [];

  for (let index = 0; index < totalMonths; index++) {
    const month = addMonths(settings.startMonth, index);
    const isAvailable = (item: WatchItem) =>
      (remaining.get(item.id) ?? 0) > 0 &&
      (!item.releaseMonth || compareMonths(item.releaseMonth, month) <= 0) &&
      (!item.leavingMonth || compareMonths(month, item.leavingMonth) <= 0);

    const candidates: Candidate[] = rotating.map((service) => {
      const items = pending.filter(
        (item) => item.serviceIds.includes(service.serviceId) && isAvailable(item),
      );
      const hours = Math.min(hoursPerMonth, sum(items.map((item) => remaining.get(item.id) ?? 0)));
      const releases = items.filter((item) => item.releaseMonth === month);
      const leavings = items.filter((item) => item.leavingMonth === month);
      const value =
        hours + RELEASE_WEIGHT_HOURS * releases.length + LEAVING_WEIGHT_HOURS * leavings.length;
      return { service, items, releases, leavings, score: value / service.monthlyCents };
    });

    const byRecency = (a: Candidate, b: Candidate) =>
      (lastUsed.get(a.service.serviceId) ?? -1) - (lastUsed.get(b.service.serviceId) ?? -1);
    const byPriceDesc = (a: Candidate, b: Candidate) =>
      b.service.monthlyCents - a.service.monthlyCents;
    const byId = (a: Candidate, b: Candidate) =>
      a.service.serviceId.localeCompare(b.service.serviceId);

    const chosen = hasDemand
      ? candidates
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score || byRecency(a, b) || byId(a, b))
          .slice(0, concurrent)
      : [...candidates]
          .sort((a, b) => byRecency(a, b) || byPriceDesc(a, b) || byId(a, b))
          .slice(0, concurrent);

    const reasons: Record<string, MonthReason[]> = {};
    for (const candidate of chosen) {
      const id = candidate.service.serviceId;
      lastUsed.set(id, index);
      if (!hasDemand) {
        reasons[id] = [{ kind: "rotation" }];
        continue;
      }
      const watched = consume(candidate.items, remaining, hoursPerMonth);
      reasons[id] = [
        ...candidate.releases.map((item): MonthReason => ({
          kind: "release",
          itemId: item.id,
          title: item.title,
        })),
        ...candidate.leavings.map((item): MonthReason => ({
          kind: "leaving",
          itemId: item.id,
          title: item.title,
        })),
        ...(watched > 0 ? [{ kind: "watchlist", hours: watched } as const] : []),
      ];
    }

    months.push({
      month,
      serviceIds: chosen.map((c) => c.service.serviceId).sort(),
      reasons,
      costCents: fixedMonthlyCents + sum(chosen.map((c) => c.service.monthlyCents)),
    });
  }

  const planCents = sum(months.map((m) => m.costCents));
  return {
    months,
    annualServiceIds: annual.map((s) => s.serviceId),
    alwaysOnServiceIds: alwaysOn.map((s) => s.serviceId),
    baselineCents,
    planCents,
    savingsCents: baselineCents - planCents,
    events: buildEvents(months, rotating),
  };
}

/** Assiste até `budget` horas dos itens, começando pelos que saem do catálogo primeiro. */
function consume(items: WatchItem[], remaining: Map<string, number>, budget: number): number {
  const ordered = [...items].sort(
    (a, b) =>
      compareMonths(a.leavingMonth ?? "9999-12", b.leavingMonth ?? "9999-12") ||
      a.id.localeCompare(b.id),
  );
  let left = budget;
  for (const item of ordered) {
    if (left <= 0) break;
    const hours = remaining.get(item.id) ?? 0;
    const used = Math.min(hours, left);
    remaining.set(item.id, hours - used);
    left -= used;
  }
  return budget - left;
}

/**
 * Para cada sequência de meses seguidos de um serviço: assinar no dia 1 do primeiro mês e cancelar
 * no dia 2 do último. O acesso continua até o fim do período já pago.
 */
function buildEvents(months: PlannedMonth[], rotating: UserService[]): RotationEvent[] {
  const events: RotationEvent[] = [];
  for (const service of rotating) {
    let runStart: YearMonth | null = null;
    months.forEach((planned, index) => {
      const active = planned.serviceIds.includes(service.serviceId);
      const nextActive = months[index + 1]?.serviceIds.includes(service.serviceId) ?? false;
      if (active && runStart === null) runStart = planned.month;
      if (active && !nextActive && runStart !== null) {
        events.push(
          {
            type: "subscribe",
            serviceId: service.serviceId,
            date: dayOf(runStart, 1),
            billing: service.billing,
          },
          {
            type: "cancel",
            serviceId: service.serviceId,
            date: dayOf(planned.month, 2),
            billing: service.billing,
          },
        );
        runStart = null;
      }
    });
  }
  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      b.type.localeCompare(a.type) ||
      a.serviceId.localeCompare(b.serviceId),
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
