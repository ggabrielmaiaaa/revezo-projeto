import { BUNDLES, type Bundle } from "@/lib/catalog/bundles";
import { TIER_RANK, type Tier } from "@/lib/catalog/services";

/** Um serviço avulso que o usuário paga. */
export interface ServiceHolding {
  kind: "service";
  serviceId: string;
  tier: Tier;
  monthlyCents: number;
}

/** Um pacote que o usuário paga. */
export interface BundleHolding {
  kind: "bundle";
  bundleId: string;
  monthlyCents: number;
}

export type Holding = ServiceHolding | BundleHolding;

/** Paga um serviço avulso que um pacote dele já inclui, no mesmo nível ou melhor: cancelar o avulso. */
export interface Duplicate {
  serviceId: string;
  bundleId: string;
  savingsCents: number;
}

/** O pacote inclui o serviço, mas num nível abaixo (ex.: com anúncios). Cancelar o avulso economiza, mas piora o plano. */
export interface DowngradeOption {
  serviceId: string;
  bundleId: string;
  heldTier: Tier;
  includedTier: Tier;
  savingsCents: number;
}

/** Trocar vários avulsos por um pacote que inclui todos eles sai mais barato. */
export interface BundleSwap {
  bundleId: string;
  replaces: string[];
  /** Serviços que ficariam num nível abaixo do que o usuário tem hoje. */
  downgrades: Array<{ serviceId: string; heldTier: Tier; includedTier: Tier }>;
  savingsCents: number;
}

export interface OverlapReport {
  duplicates: Duplicate[];
  downgradeOptions: DowngradeOption[];
  bundleSwaps: BundleSwap[];
  /** Soma do que dá para economizar por mês só cancelando os avulsos em dobro (sem perder nada). */
  safeSavingsCents: number;
}

/**
 * Encontra assinaturas pagas em dobro e pacotes que sairiam mais baratos.
 * Função pura: recebe o que o usuário paga hoje e o catálogo de pacotes.
 */
export function findOverlaps(
  holdings: Holding[],
  bundles: readonly Bundle[] = BUNDLES,
): OverlapReport {
  const services = holdings.filter((h): h is ServiceHolding => h.kind === "service");
  const heldBundles = holdings
    .filter((h): h is BundleHolding => h.kind === "bundle")
    .map((h) => bundles.find((b) => b.id === h.bundleId))
    .filter((b): b is Bundle => b !== undefined);

  const duplicates: Duplicate[] = [];
  const downgradeOptions: DowngradeOption[] = [];
  for (const service of services) {
    // Entre os pacotes que o usuário já tem, o melhor nível incluído para este serviço.
    const inclusions = heldBundles.flatMap((bundle) =>
      bundle.includes
        .filter((inc) => inc.serviceId === service.serviceId)
        .map((inc) => ({ bundleId: bundle.id, tier: inc.tier })),
    );
    if (inclusions.length === 0) continue;
    const best = inclusions.reduce((a, b) => (TIER_RANK[b.tier] > TIER_RANK[a.tier] ? b : a));
    if (TIER_RANK[best.tier] >= TIER_RANK[service.tier]) {
      duplicates.push({
        serviceId: service.serviceId,
        bundleId: best.bundleId,
        savingsCents: service.monthlyCents,
      });
    } else {
      downgradeOptions.push({
        serviceId: service.serviceId,
        bundleId: best.bundleId,
        heldTier: service.tier,
        includedTier: best.tier,
        savingsCents: service.monthlyCents,
      });
    }
  }

  // Pacotes que o usuário não tem e que substituiriam avulsos (fora os já cobertos) por menos.
  // Vale até para um serviço só: o Meli+ Total custa menos que o Disney+ avulso e ainda traz frete.
  const coveredIds = new Set([...duplicates, ...downgradeOptions].map((d) => d.serviceId));
  const remaining = services.filter((s) => !coveredIds.has(s.serviceId));
  const heldBundleIds = new Set(heldBundles.map((b) => b.id));
  const bundleSwaps: BundleSwap[] = [];
  for (const bundle of bundles) {
    if (heldBundleIds.has(bundle.id)) continue;
    const replaced = remaining.filter((s) =>
      bundle.includes.some((inc) => inc.serviceId === s.serviceId),
    );
    if (replaced.length === 0) continue;
    const savingsCents = sum(replaced.map((s) => s.monthlyCents)) - bundle.monthlyCents;
    if (savingsCents <= 0) continue;
    bundleSwaps.push({
      bundleId: bundle.id,
      replaces: replaced.map((s) => s.serviceId),
      downgrades: replaced.flatMap((s) => {
        const inc = bundle.includes.find((i) => i.serviceId === s.serviceId);
        return inc && TIER_RANK[inc.tier] < TIER_RANK[s.tier]
          ? [{ serviceId: s.serviceId, heldTier: s.tier, includedTier: inc.tier }]
          : [];
      }),
      savingsCents,
    });
  }
  bundleSwaps.sort(
    (a, b) => b.savingsCents - a.savingsCents || a.bundleId.localeCompare(b.bundleId),
  );

  return {
    duplicates,
    downgradeOptions,
    bundleSwaps,
    safeSavingsCents: sum(duplicates.map((d) => d.savingsCents)),
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
