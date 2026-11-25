import { describe, expect, it } from "vitest";
import { evaluatePayoff, type Usage } from "./payoff";
import { usageSchema } from "./schema";

const none: Usage = {
  rideSpendCents: 0,
  deliveriesPerMonth: 0,
  deliverySavingCents: 600,
  mercadoLivreOrders: 0,
  amazonOrders: 0,
  shippingSavingCents: 1500,
  wantedStreamingIds: [],
};
const item = (report: ReturnType<typeof evaluatePayoff>, id: string) => {
  const found = report.items.find((i) => i.id === id);
  if (!found) throw new Error(`sem ${id}`);
  return found;
};

describe("evaluatePayoff", () => {
  it("Uber One se paga a partir de R$ 249/mês em corridas", () => {
    const rico = evaluatePayoff({ ...none, rideSpendCents: 30_000 });
    expect(item(rico, "uber-one")).toMatchObject({
      valueCents: 3000,
      netCents: 3000 - 2490,
      verdict: "pays",
      breakEven: { usage: "rideSpendCents", needed: 24_900 },
    });

    const pouco = evaluatePayoff({ ...none, rideSpendCents: 12_000 });
    expect(item(pouco, "uber-one").verdict).toBe("no");
  });

  it("Clube iFood se paga com 3 pedidos se a entrega economizada é R$ 6", () => {
    const report = evaluatePayoff({ ...none, deliveriesPerMonth: 3 });
    expect(item(report, "ifood-clube")).toMatchObject({
      valueCents: 1800,
      verdict: "pays",
      breakEven: { usage: "deliveriesPerMonth", needed: 3 },
    });
  });

  it("quem usa Uber e iFood: recomenda o combo, não os dois separados", () => {
    const report = evaluatePayoff({ ...none, rideSpendCents: 30_000, deliveriesPerMonth: 3 });
    expect(item(report, "combo-uber-ifood")).toMatchObject({
      valueCents: 4800,
      netCents: 4800 - 2190,
    });
    expect(report.subscribe).toContain("combo-uber-ifood");
    expect(report.subscribe).not.toContain("uber-one");
    expect(report.subscribe).not.toContain("ifood-clube");
  });

  it("quer Disney+: o Meli+ Total se paga só pelo streaming, e é o Meli+ recomendado", () => {
    const report = evaluatePayoff({ ...none, wantedStreamingIds: ["disney"] });
    expect(item(report, "meli-total")).toMatchObject({ valueCents: 2990, verdict: "pays" });
    expect(report.subscribe.filter((id) => id.startsWith("meli"))).toEqual(["meli-total"]);
  });

  it("Meli+ Mega: Netflix e Max vêm com anúncios e não contam valor para quem tem plano sem anúncios", () => {
    const report = evaluatePayoff({
      ...none,
      wantedStreamingIds: ["netflix", "max", "disney", "apple"],
    });
    const mega = item(report, "meli-mega");
    expect(mega.lowerTierStreamingIds).toEqual(["netflix", "max"]);
    expect(mega.valueCents).toBe(2990 + 2990);
    expect(mega.verdict).toBe("almost");
  });

  it("frete conta: 2 compras no Mercado Livre por mês pagam o Meli+ Essencial", () => {
    const report = evaluatePayoff({ ...none, mercadoLivreOrders: 2 });
    expect(item(report, "meli-essencial")).toMatchObject({
      valueCents: 3000,
      verdict: "pays",
      breakEven: { usage: "mercadoLivreOrders", needed: 1 },
    });
  });

  it("assina Uber One e quase não usa, mas pede delivery: cancelar o Uber One e assinar o Clube iFood", () => {
    const report = evaluatePayoff({ ...none, rideSpendCents: 5000, deliveriesPerMonth: 4 }, [
      "uber-one",
    ]);
    expect(report.cancel).toEqual(["uber-one"]);
    // Clube iFood sobra R$ 11,10; o combo sobraria só R$ 7,10.
    expect(report.subscribe).toContain("ifood-clube");
    expect(report.subscribe).not.toContain("combo-uber-ifood");
  });

  it("assina Clube iFood e também anda muito de Uber: sugere trocar pelo combo", () => {
    const report = evaluatePayoff({ ...none, rideSpendCents: 30_000, deliveriesPerMonth: 3 }, [
      "ifood-clube",
    ]);
    expect(report.cancel).toEqual([]);
    expect(report.switches).toEqual([
      { from: "ifood-clube", to: "combo-uber-ifood", extraNetCents: 2610 - 510 },
    ]);
    expect(report.subscribe).not.toContain("uber-one");
  });

  it("sem uso nenhum, nada é recomendado", () => {
    expect(evaluatePayoff(none).subscribe).toEqual([]);
  });
});

describe("usageSchema", () => {
  it("aceita uso válido e recusa valores negativos", () => {
    expect(usageSchema.safeParse(none).success).toBe(true);
    expect(usageSchema.safeParse({ ...none, deliveriesPerMonth: -1 }).success).toBe(false);
  });
});
