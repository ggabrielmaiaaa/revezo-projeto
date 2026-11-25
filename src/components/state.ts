import { BUNDLES } from "@/lib/catalog/bundles";
import { CATALOG, type Tier } from "@/lib/catalog/services";
import type { Usage } from "@/lib/payoff";

export interface ServiceState {
  on: boolean;
  tier: Tier;
  cents: number;
}
export type ServicesState = Record<string, ServiceState>;
export type BundlesState = Record<string, boolean>;
export type UsageNumbers = Omit<Usage, "wantedStreamingIds">;

export const VIDEO = CATALOG.filter((s) => s.category === "video");
export const OTHERS = CATALOG.filter((s) => s.category !== "video");

const services = (on: string[]): ServicesState =>
  Object.fromEntries(
    CATALOG.map((s) => [s.id, { on: on.includes(s.id), tier: s.tier, cents: s.monthlyCents }]),
  );
const bundles = (on: string[]): BundlesState =>
  Object.fromEntries(BUNDLES.map((b) => [b.id, on.includes(b.id)]));

/**
 * Exemplo que abre a tela: um caso comum e cheio de descobertas
 * (Disney+ pago em dobro com o Meli+ Total, Netflix e Max para revezar, Uber One quase sem uso).
 */
export const EXAMPLE = {
  services: services(["disney", "netflix", "max", "uber-one"]),
  bundles: bundles(["meli-total"]),
  usage: {
    rideSpendCents: 8000,
    deliveriesPerMonth: 4,
    deliverySavingCents: 700,
    mercadoLivreOrders: 2,
    amazonOrders: 0,
    shippingSavingCents: 1500,
  } satisfies UsageNumbers,
};

export const EMPTY = {
  services: services([]),
  bundles: bundles([]),
  usage: {
    rideSpendCents: 0,
    deliveriesPerMonth: 0,
    deliverySavingCents: 700,
    mercadoLivreOrders: 0,
    amazonOrders: 0,
    shippingSavingCents: 1500,
  } satisfies UsageNumbers,
};
