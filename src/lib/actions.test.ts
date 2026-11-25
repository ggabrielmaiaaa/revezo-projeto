import { describe, expect, it } from "vitest";
import { buildActions, totalYearly } from "./actions";
import { optimize } from "./optimize";
import type { Holding } from "./overlaps";
import { evaluatePayoff } from "./payoff";

const holdings: Holding[] = [
  { kind: "bundle", bundleId: "meli-total", monthlyCents: 1990 },
  { kind: "service", serviceId: "disney", tier: "ads", monthlyCents: 2990 },
  { kind: "service", serviceId: "netflix", tier: "standard", monthlyCents: 4490 },
  { kind: "service", serviceId: "max", tier: "standard", monthlyCents: 4490 },
  { kind: "service", serviceId: "uber-one", tier: "standard", monthlyCents: 2490 },
];
const usage = {
  rideSpendCents: 5000,
  deliveriesPerMonth: 4,
  deliverySavingCents: 600,
  mercadoLivreOrders: 0,
  amazonOrders: 0,
  shippingSavingCents: 1500,
  wantedStreamingIds: ["disney", "netflix", "max"],
};

describe("buildActions", () => {
  const result = optimize({ holdings, watchlist: [], options: { startMonth: "2027-01" } });
  const payoff = evaluatePayoff(usage, ["meli-total", "disney", "netflix", "max", "uber-one"]);
  const actions = buildActions(result, payoff);
  const ids = actions.map((a) => a.id);

  it("lista cancelar em dobro, rodízio, cancelar o que não se paga e assinar o que se paga", () => {
    expect(ids).toContain("dup-disney");
    expect(ids).toContain("rotate");
    expect(ids).toContain("payoff-cancel-uber-one");
    expect(ids).toContain("subscribe-ifood-clube");
  });

  it("o total contado = economia do optimize + ganhos da calculadora", () => {
    const uber = payoff.items.find((i) => i.id === "uber-one")!;
    const ifood = payoff.items.find((i) => i.id === "ifood-clube")!;
    expect(totalYearly(actions)).toBe(
      result.savingsCents + -uber.netCents * 12 + ifood.netCents * 12,
    );
  });

  it("alternativas e opções que pioram o plano ficam por último e fora do total", () => {
    const options = actions.filter((a) => !a.counted);
    expect(options.every((a) => a.kind === "option")).toBe(true);
    expect(actions.slice(-options.length)).toEqual(options);
  });
});
