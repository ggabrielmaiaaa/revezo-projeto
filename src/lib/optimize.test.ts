import { describe, expect, it } from "vitest";
import { optimize } from "./optimize";
import type { Holding } from "./overlaps";

const holdings: Holding[] = [
  { kind: "bundle", bundleId: "meli-total", monthlyCents: 1990 },
  { kind: "service", serviceId: "disney", tier: "ads", monthlyCents: 2990 },
  { kind: "service", serviceId: "netflix", tier: "standard", monthlyCents: 4490 },
  { kind: "service", serviceId: "max", tier: "standard", monthlyCents: 4490 },
];
const options = { startMonth: "2027-01" };

describe("optimize", () => {
  it("Meli+ Total + Disney+ avulso + Netflix + Max: cancela o Disney+ e reveza Netflix e Max", () => {
    const result = optimize({ holdings, watchlist: [], options });

    expect(result.cancelServiceIds).toEqual(["disney"]);
    expect(result.coveredByBundles).toEqual(["disney"]);
    expect(result.rotation.months.map((m) => m.serviceIds)).toEqual(
      Array.from({ length: 12 }, (_, i) => [i % 2 === 0 ? "max" : "netflix"]),
    );
    expect(result.currentCents).toBe((1990 + 2990 + 4490 + 4490) * 12);
    expect(result.plannedCents).toBe(1990 * 12 + 6 * 4490 * 2);
    expect(result.savingsCents).toBe(result.currentCents - result.plannedCents);
  });

  it("título que só está no Disney+ (já pago no pacote) não puxa assinatura nenhuma", () => {
    const result = optimize({
      holdings,
      watchlist: [{ id: "x", title: "Série do Disney+", serviceIds: ["disney"], hours: 50 }],
      options,
    });
    expect(result.rotation.months.every((m) => m.serviceIds.length === 0)).toBe(true);
    expect(result.plannedCents).toBe(1990 * 12);
  });

  it("título no Disney+ e na Max: assiste pelo pacote, sem assinar a Max", () => {
    const result = optimize({
      holdings,
      watchlist: [
        { id: "dup", title: "Nos dois", serviceIds: ["disney", "max"], hours: 20 },
        { id: "n", title: "Só Netflix", serviceIds: ["netflix"], hours: 10 },
      ],
      options,
    });
    const active = result.rotation.months.flatMap((m) => m.serviceIds);
    expect(active).toEqual(["netflix"]);
  });

  it("Uber One e Clube iFood não entram no rodízio: ficam como custo fixo", () => {
    const result = optimize({
      holdings: [
        { kind: "service", serviceId: "uber-one", tier: "standard", monthlyCents: 2490 },
        { kind: "service", serviceId: "netflix", tier: "standard", monthlyCents: 4490 },
        { kind: "service", serviceId: "max", tier: "standard", monthlyCents: 4490 },
      ],
      watchlist: [],
      options,
    });
    expect(result.rotation.months.flatMap((m) => m.serviceIds)).not.toContain("uber-one");
    expect(result.plannedCents).toBe(2490 * 12 + 6 * 4490 * 2);
  });

  it("não aplica sozinho troca que piora o plano: Disney+ sem anúncios continua no rodízio", () => {
    const result = optimize({
      holdings: [
        { kind: "bundle", bundleId: "meli-total", monthlyCents: 1990 },
        { kind: "service", serviceId: "disney", tier: "standard", monthlyCents: 4490 },
        { kind: "service", serviceId: "netflix", tier: "standard", monthlyCents: 4490 },
      ],
      watchlist: [],
      options,
    });
    expect(result.cancelServiceIds).toEqual([]);
    expect(result.overlaps.downgradeOptions.map((d) => d.serviceId)).toEqual(["disney"]);
    expect(result.rotation.months.flatMap((m) => m.serviceIds)).toContain("disney");
  });
});
