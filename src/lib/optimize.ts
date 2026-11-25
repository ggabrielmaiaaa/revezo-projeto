import { findBundle } from "@/lib/catalog/bundles";
import { findService } from "@/lib/catalog/services";
import {
  findOverlaps,
  type Holding,
  type OverlapReport,
  type ServiceHolding,
} from "@/lib/overlaps";
import {
  planRotation,
  type RotationOptions,
  type RotationPlan,
  type WatchItem,
} from "@/lib/rotation";

export interface OptimizeInput {
  /** O que o usuário paga hoje: serviços avulsos e pacotes. */
  holdings: Holding[];
  watchlist: WatchItem[];
  options: Omit<RotationOptions, "coveredServiceIds">;
}

export interface OptimizeResult {
  overlaps: OverlapReport;
  /** Serviços avulsos a cancelar porque um pacote do usuário já os inclui. */
  cancelServiceIds: string[];
  /** Serviços que o usuário já recebe dentro dos pacotes que tem. */
  coveredByBundles: string[];
  rotation: RotationPlan;
  /** Quanto o usuário gasta no período mantendo tudo como está. */
  currentCents: number;
  /** Quanto gasta no período com o plano: pacotes e assinaturas que não são vídeo + rodízio do streaming. */
  plannedCents: number;
  savingsCents: number;
}

/**
 * Junta as duas economias do app:
 * 1. Cancela o que é pago em dobro (o pacote do usuário já inclui, no mesmo nível ou melhor).
 * 2. Serviços cobertos por pacotes ficam fora do rodízio; o resto entra no rodízio.
 * Trocas de pacote e opções que pioram o plano (ex.: aceitar anúncios) só são sugeridas em
 * `overlaps`, nunca aplicadas: a escolha é do usuário.
 */
export function optimize({ holdings, watchlist, options }: OptimizeInput): OptimizeResult {
  const totalMonths = options.months ?? 12;
  const overlaps = findOverlaps(holdings);
  const cancelServiceIds = overlaps.duplicates.map((d) => d.serviceId);

  const bundleHoldings = holdings.filter((h) => h.kind === "bundle");
  const coveredByBundles = [
    ...new Set(
      bundleHoldings.flatMap(
        (h) => findBundle(h.bundleId)?.includes.map((inc) => inc.serviceId) ?? [],
      ),
    ),
  ];

  const kept = holdings.filter(
    (h): h is ServiceHolding => h.kind === "service" && !cancelServiceIds.includes(h.serviceId),
  );
  // Só streaming de vídeo entra no rodízio. Delivery, mobilidade etc. ficam como estão
  // (a decisão sobre elas vem da calculadora de "se paga", não do rodízio).
  const isVideo = (h: ServiceHolding) => findService(h.serviceId)?.category === "video";
  const fixedServices = kept.filter((h) => !isVideo(h));
  const rotation = planRotation({
    services: kept.filter(isVideo).map((h) => {
      const catalog = findService(h.serviceId);
      return {
        serviceId: h.serviceId,
        monthlyCents: h.monthlyCents,
        // O preço anual do catálogo vale para o nível de referência; em outro nível, não há como saber.
        annualMonthlyCents: catalog && catalog.tier === h.tier ? catalog.annualMonthlyCents : null,
        billing: "direct",
      };
    }),
    watchlist,
    options: { ...options, coveredServiceIds: coveredByBundles },
  });

  const currentCents = sum(holdings.map((h) => h.monthlyCents)) * totalMonths;
  const plannedCents =
    sum([...bundleHoldings, ...fixedServices].map((h) => h.monthlyCents)) * totalMonths +
    rotation.planCents;
  return {
    overlaps,
    cancelServiceIds,
    coveredByBundles,
    rotation,
    currentCents,
    plannedCents,
    savingsCents: currentCents - plannedCents,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
