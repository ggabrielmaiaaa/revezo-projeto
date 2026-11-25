import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/catalog/services";
import { planRotation } from "./plan";
import { rotationInputSchema } from "./schema";
import type { UserService, WatchItem } from "./types";

const service = (id: string): UserService => {
  const entry = CATALOG.find((s) => s.id === id);
  if (!entry) throw new Error(`serviço ${id} fora do catálogo`);
  return {
    serviceId: entry.id,
    monthlyCents: entry.monthlyCents,
    annualMonthlyCents: entry.annualMonthlyCents,
    billing: "direct",
  };
};
// Os 5 serviços da análise (o catálogo pode crescer sem mudar estes números).
const ALL = ["netflix", "max", "disney", "globoplay", "prime"].map(service);
const start = "2027-01";
const ids = (plan: ReturnType<typeof planRotation>) => plan.months.map((m) => m.serviceIds);

describe("planRotation sem lista", () => {
  it("reveza os 5 serviços, um por mês, e não compensa ficar no anual", () => {
    const plan = planRotation({ services: ALL, watchlist: [], options: { startMonth: start } });

    expect(ids(plan)).toEqual([
      ["max"],
      ["netflix"],
      ["disney"],
      ["globoplay"],
      ["prime"],
      ["max"],
      ["netflix"],
      ["disney"],
      ["globoplay"],
      ["prime"],
      ["max"],
      ["netflix"],
    ]);
    expect(plan.annualServiceIds).toEqual([]);
    expect(plan.baselineCents).toBe(195_000);
    expect(plan.planCents).toBe(41_480);
    expect(plan.savingsCents).toBe(153_520);
    expect(plan.events).toHaveLength(24);
  });

  it("três serviços caros: cada um fica 4 meses", () => {
    const plan = planRotation({
      services: ["netflix", "max", "disney"].map(service),
      watchlist: [],
      options: { startMonth: start },
    });
    for (const id of ["netflix", "max", "disney"]) {
      expect(plan.months.filter((m) => m.serviceIds.includes(id))).toHaveLength(4);
    }
    expect(plan.baselineCents).toBe(143_640);
    expect(plan.planCents).toBe(47_880);
  });

  it("assina no dia 1 e cancela no dia 2 do mesmo mês", () => {
    const plan = planRotation({
      services: ["netflix", "max"].map(service),
      watchlist: [],
      options: { startMonth: "2027-11", months: 3 },
    });
    expect(plan.events).toEqual([
      { type: "subscribe", serviceId: "max", date: "2027-11-01", billing: "direct" },
      { type: "cancel", serviceId: "max", date: "2027-11-02", billing: "direct" },
      { type: "subscribe", serviceId: "netflix", date: "2027-12-01", billing: "direct" },
      { type: "cancel", serviceId: "netflix", date: "2027-12-02", billing: "direct" },
      { type: "subscribe", serviceId: "max", date: "2028-01-01", billing: "direct" },
      { type: "cancel", serviceId: "max", date: "2028-01-02", billing: "direct" },
    ]);
  });

  it("um serviço só: não há rodízio nem economia", () => {
    const plan = planRotation({
      services: [service("netflix")],
      watchlist: [],
      options: { startMonth: start },
    });
    expect(plan.alwaysOnServiceIds).toEqual(["netflix"]);
    expect(plan.savingsCents).toBe(0);
    expect(plan.events).toEqual([]);
  });

  it("um serviço só, com anual mais barato: vai para o anual", () => {
    const plan = planRotation({
      services: [service("prime")],
      watchlist: [],
      options: { startMonth: start },
    });
    expect(plan.annualServiceIds).toEqual(["prime"]);
    expect(plan.planCents).toBe(1390 * 12);
    expect(plan.savingsCents).toBe((1990 - 1390) * 12);
  });

  it("anual desligado: o serviço fica no mensal", () => {
    const plan = planRotation({
      services: [service("prime")],
      watchlist: [],
      options: { startMonth: start, useAnnual: false },
    });
    expect(plan.annualServiceIds).toEqual([]);
    expect(plan.savingsCents).toBe(0);
  });

  it("dois ao mesmo tempo: todo mês tem 2 serviços diferentes", () => {
    const plan = planRotation({
      services: ["netflix", "max", "disney"].map(service),
      watchlist: [],
      options: { startMonth: start, concurrent: 2 },
    });
    for (const month of plan.months) {
      expect(new Set(month.serviceIds).size).toBe(2);
    }
    expect(plan.savingsCents).toBeGreaterThan(0);
  });
});

describe("planRotation com lista", () => {
  const services = ["netflix", "max", "disney"].map(service);

  it("leva o serviço para o mês da estreia e pausa quando não há o que ver", () => {
    const watchlist: WatchItem[] = [
      { id: "serie-n", title: "Série N", serviceIds: ["netflix"], hours: 60 },
      { id: "serie-m", title: "Série M", serviceIds: ["max"], hours: 10, releaseMonth: "2027-03" },
    ];
    const plan = planRotation({ services, watchlist, options: { startMonth: start } });

    expect(ids(plan).slice(0, 4)).toEqual([["netflix"], ["netflix"], ["max"], []]);
    expect(plan.months[2]?.reasons.max).toContainEqual({
      kind: "release",
      itemId: "serie-m",
      title: "Série M",
    });
    expect(plan.planCents).toBe(3 * 4490);
    expect(plan.events).toEqual([
      { type: "subscribe", serviceId: "netflix", date: "2027-01-01", billing: "direct" },
      { type: "cancel", serviceId: "netflix", date: "2027-02-02", billing: "direct" },
      { type: "subscribe", serviceId: "max", date: "2027-03-01", billing: "direct" },
      { type: "cancel", serviceId: "max", date: "2027-03-02", billing: "direct" },
    ]);
  });

  it("prioriza o título que sai do catálogo no mês", () => {
    const watchlist: WatchItem[] = [
      { id: "longa", title: "Série longa", serviceIds: ["netflix"], hours: 100 },
      {
        id: "saindo",
        title: "Filme saindo",
        serviceIds: ["disney"],
        hours: 5,
        leavingMonth: "2027-02",
      },
    ];
    const plan = planRotation({ services, watchlist, options: { startMonth: start } });

    expect(ids(plan).slice(0, 3)).toEqual([["netflix"], ["disney"], ["netflix"]]);
    expect(plan.months[1]?.reasons.disney).toContainEqual({
      kind: "leaving",
      itemId: "saindo",
      title: "Filme saindo",
    });
  });

  it("não assina para ver algo que já saiu do catálogo", () => {
    const watchlist: WatchItem[] = [
      { id: "foi", title: "Já saiu", serviceIds: ["max"], hours: 5, leavingMonth: "2026-12" },
    ];
    const plan = planRotation({ services, watchlist, options: { startMonth: start } });
    expect(plan.months.every((m) => m.serviceIds.length === 0)).toBe(true);
    expect(plan.planCents).toBe(0);
  });

  it("serviço usado o ano todo vai para o anual, e os outros pausam", () => {
    const watchlist: WatchItem[] = [
      { id: "novelas", title: "Novelas", serviceIds: ["globoplay"], hours: 400 },
    ];
    const plan = planRotation({
      services: ["globoplay", "netflix", "max"].map(service),
      watchlist,
      options: { startMonth: start },
    });
    expect(plan.annualServiceIds).toEqual(["globoplay"]);
    expect(plan.months.every((m) => m.serviceIds.length === 0)).toBe(true);
    expect(plan.planCents).toBe(1490 * 12);
  });
});

describe("rotationInputSchema", () => {
  it("aceita uma entrada válida", () => {
    const result = rotationInputSchema.safeParse({
      services: ALL,
      watchlist: [{ id: "a", title: "A", serviceIds: ["max"], hours: 2, releaseMonth: "2027-05" }],
      options: { startMonth: start, concurrent: 2 },
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["mês inválido", { services: ALL, watchlist: [], options: { startMonth: "2027-13" } }],
    [
      "serviço repetido",
      { services: [ALL[0], ALL[0]], watchlist: [], options: { startMonth: start } },
    ],
    [
      "preço negativo",
      {
        services: [{ ...ALL[0], monthlyCents: -1 }],
        watchlist: [],
        options: { startMonth: start },
      },
    ],
    [
      "estreia depois da saída",
      {
        services: ALL,
        watchlist: [
          {
            id: "a",
            title: "A",
            serviceIds: ["max"],
            hours: 2,
            releaseMonth: "2027-05",
            leavingMonth: "2027-01",
          },
        ],
        options: { startMonth: start },
      },
    ],
    [
      "3 ao mesmo tempo",
      { services: ALL, watchlist: [], options: { startMonth: start, concurrent: 3 } },
    ],
  ])("recusa %s", (_name, input) => {
    expect(rotationInputSchema.safeParse(input).success).toBe(false);
  });
});
