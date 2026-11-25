import { describe, expect, it } from "vitest";
import { findOverlaps } from "./overlaps";
import { holdingsSchema } from "./schema";
import type { Holding } from "./overlaps";

const svc = (
  serviceId: string,
  tier: "ads" | "standard" | "premium",
  monthlyCents: number,
): Holding => ({
  kind: "service",
  serviceId,
  tier,
  monthlyCents,
});
const bundle = (bundleId: string, monthlyCents: number): Holding => ({
  kind: "bundle",
  bundleId,
  monthlyCents,
});

describe("findOverlaps", () => {
  it("Disney+ avulso + Meli+ Total: paga em dobro, cancelar o avulso", () => {
    const report = findOverlaps([svc("disney", "ads", 2990), bundle("meli-total", 1990)]);
    expect(report.duplicates).toEqual([
      { serviceId: "disney", bundleId: "meli-total", savingsCents: 2990 },
    ]);
    expect(report.safeSavingsCents).toBe(2990);
    expect(report.downgradeOptions).toEqual([]);
  });

  it("Disney+ sem anúncios + Meli+ Total: não é dobro, mas mostra a opção de economizar aceitando anúncios", () => {
    const report = findOverlaps([svc("disney", "standard", 4490), bundle("meli-total", 1990)]);
    expect(report.duplicates).toEqual([]);
    expect(report.downgradeOptions).toEqual([
      {
        serviceId: "disney",
        bundleId: "meli-total",
        heldTier: "standard",
        includedTier: "ads",
        savingsCents: 4490,
      },
    ]);
    expect(report.safeSavingsCents).toBe(0);
  });

  it("quatro avulsos que o Meli+ Mega cobre: sugere a troca e avisa o que passa a ter anúncios", () => {
    const report = findOverlaps([
      svc("netflix", "standard", 4490),
      svc("max", "standard", 4490),
      svc("disney", "ads", 2990),
      svc("apple", "standard", 2990),
    ]);
    const mega = report.bundleSwaps.find((s) => s.bundleId === "meli-mega");
    expect(mega).toEqual({
      bundleId: "meli-mega",
      replaces: ["netflix", "max", "disney", "apple"],
      downgrades: [
        { serviceId: "netflix", heldTier: "standard", includedTier: "ads" },
        { serviceId: "max", heldTier: "standard", includedTier: "ads" },
      ],
      savingsCents: 14_960 - 7490,
    });
    expect(report.bundleSwaps[0]?.bundleId).toBe("meli-mega");
  });

  it("só Disney+ e Apple TV+: o Mega sairia mais caro, então não sugere", () => {
    const report = findOverlaps([svc("disney", "ads", 2990), svc("apple", "standard", 2990)]);
    expect(report.bundleSwaps.map((s) => s.bundleId)).toEqual(["meli-total"]);
  });

  it("Disney+ com anúncios sozinho: o Meli+ Total custa menos e traz o mesmo plano", () => {
    const report = findOverlaps([svc("disney", "ads", 2990)]);
    expect(report.bundleSwaps).toEqual([
      { bundleId: "meli-total", replaces: ["disney"], downgrades: [], savingsCents: 1000 },
    ]);
  });

  it("não sugere pacote que o usuário já tem nem repete serviços já cobertos", () => {
    const report = findOverlaps([
      bundle("meli-mega", 7490),
      svc("netflix", "ads", 2090),
      svc("disney", "ads", 2990),
    ]);
    expect(report.duplicates.map((d) => d.serviceId)).toEqual(["netflix", "disney"]);
    expect(report.bundleSwaps).toEqual([]);
    expect(report.safeSavingsCents).toBe(2090 + 2990);
  });

  it("ignora pacote desconhecido e serviço que nenhum pacote cobre", () => {
    const report = findOverlaps([bundle("nao-existe", 1000), svc("globoplay", "ads", 2290)]);
    expect(report).toEqual({
      duplicates: [],
      downgradeOptions: [],
      bundleSwaps: [],
      safeSavingsCents: 0,
    });
  });
});

describe("holdingsSchema", () => {
  it("aceita uma lista válida", () => {
    expect(
      holdingsSchema.safeParse([svc("disney", "ads", 2990), bundle("meli-total", 1990)]).success,
    ).toBe(true);
  });

  it("recusa assinatura repetida, preço zero e nível inválido", () => {
    expect(
      holdingsSchema.safeParse([svc("disney", "ads", 2990), svc("disney", "ads", 2990)]).success,
    ).toBe(false);
    expect(holdingsSchema.safeParse([svc("disney", "ads", 0)]).success).toBe(false);
    expect(
      holdingsSchema.safeParse([
        { kind: "service", serviceId: "disney", tier: "gold", monthlyCents: 100 },
      ]).success,
    ).toBe(false);
  });
});
