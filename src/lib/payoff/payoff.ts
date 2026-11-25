import { findBundle } from "@/lib/catalog/bundles";
import { findService, TIER_RANK, type Tier } from "@/lib/catalog/services";
import { VALUE_RULES, type ValueComponent } from "./rules";

/** Como a pessoa usa os serviços num mês típico. Valores em centavos. */
export interface Usage {
  /** Quanto gasta em corridas de app por mês. */
  rideSpendCents: number;
  /** Pedidos de delivery por mês. */
  deliveriesPerMonth: number;
  /** Quanto economizaria por pedido com o clube (em geral, a taxa de entrega). */
  deliverySavingCents: number;
  mercadoLivreOrders: number;
  amazonOrders: number;
  /** Frete médio que deixaria de pagar por compra. */
  shippingSavingCents: number;
  /** Streamings que a pessoa quer ter. */
  wantedStreamingIds: string[];
}

export type Verdict = "pays" | "almost" | "no";

/** O que falta para a assinatura se pagar, na unidade de uso mais importante dela. */
export type BreakEven =
  | { usage: "rideSpendCents"; needed: number }
  | { usage: "deliveriesPerMonth"; needed: number }
  | { usage: "mercadoLivreOrders"; needed: number }
  | { usage: "amazonOrders"; needed: number };

export interface PayoffItem {
  id: string;
  name: string;
  kind: "service" | "bundle";
  priceCents: number;
  /** Quanto a pessoa ganha por mês com a assinatura, item por item. */
  breakdown: Array<{ label: string; valueCents: number }>;
  valueCents: number;
  /** Valor − preço. Positivo: a assinatura se paga. */
  netCents: number;
  verdict: Verdict;
  breakEven: BreakEven | null;
  /** Streamings incluídos que a pessoa quer, mas num nível abaixo (ex.: com anúncios): não contam valor. */
  lowerTierStreamingIds: string[];
  held: boolean;
}

export interface PayoffReport {
  items: PayoffItem[];
  /** Não assina e se pagaria: vale assinar (só a melhor opção de cada grupo). */
  subscribe: string[];
  /** Assina e não se paga: vale cancelar. */
  cancel: string[];
  /** Assina e se paga, mas uma alternativa do mesmo grupo sobraria mais por mês. */
  switches: Array<{ from: string; to: string; extraNetCents: number }>;
}

/** "Quase" = cobre pelo menos 75% do preço. */
const ALMOST_SHARE = 0.75;

/**
 * Calcula, para cada assinatura com regra de valor, se ela se paga com o uso informado.
 * Função pura: recebe o uso e quais assinaturas a pessoa já tem.
 */
export function evaluatePayoff(usage: Usage, heldIds: readonly string[] = []): PayoffReport {
  const items = Object.entries(VALUE_RULES).flatMap(([id, rule]): PayoffItem[] => {
    const service = findService(id);
    const bundle = service ? undefined : findBundle(id);
    if (!service && !bundle) return [];
    const priceCents = service?.monthlyCents ?? bundle!.monthlyCents;
    const included: Array<{ serviceId: string; tier: Tier }> = service
      ? [{ serviceId: service.id, tier: service.tier }]
      : [...bundle!.includes];

    const breakdown: PayoffItem["breakdown"] = [];
    const lowerTierStreamingIds: string[] = [];
    for (const component of rule.components) {
      const part = componentValue(component, usage, included, lowerTierStreamingIds);
      if (part) breakdown.push(part);
    }
    const valueCents = breakdown.reduce((total, b) => total + b.valueCents, 0);
    const netCents = valueCents - priceCents;
    return [
      {
        id,
        name: service?.name ?? bundle!.name,
        kind: service ? "service" : "bundle",
        priceCents,
        breakdown,
        valueCents,
        netCents,
        verdict: netCents >= 0 ? "pays" : valueCents >= priceCents * ALMOST_SHARE ? "almost" : "no",
        breakEven: breakEvenFor(rule.components, usage, priceCents, breakdown),
        lowerTierStreamingIds,
        held: heldIds.includes(id),
      },
    ];
  });
  items.sort((a, b) => b.netCents - a.netCents || a.id.localeCompare(b.id));

  const groupOf = (id: string) => VALUE_RULES[id]?.group;
  const cancel = items.filter((i) => i.held && i.verdict === "no").map((i) => i.id);
  // Assinaturas que a pessoa tem e vale manter (não estão em "cancelar").
  const kept = items.filter((i) => i.held && i.verdict !== "no");

  // Trocar algo que se mantém por uma alternativa do mesmo grupo que sobra mais
  // (ex.: Clube iFood → combo Uber One + Clube iFood para quem também anda muito de Uber).
  const switches: PayoffReport["switches"] = [];
  for (const from of kept) {
    const group = groupOf(from.id);
    if (!group) continue;
    const best = items.find((i) => !i.held && groupOf(i.id) === group && i.verdict === "pays");
    if (best && best.netCents > from.netCents) {
      switches.push({ from: from.id, to: best.id, extraNetCents: best.netCents - from.netCents });
    }
  }

  // Assinar: a melhor opção de cada grupo em que a pessoa não tem nada que valha manter.
  const subscribe: string[] = [];
  const blocked = new Set(kept.map((i) => groupOf(i.id)).filter(Boolean));
  for (const item of items) {
    if (item.held || item.verdict !== "pays") continue;
    const group = groupOf(item.id);
    if (group && blocked.has(group)) continue;
    if (group) blocked.add(group);
    subscribe.push(item.id);
  }
  return { items, subscribe, cancel, switches };
}

function componentValue(
  component: ValueComponent,
  usage: Usage,
  included: Array<{ serviceId: string; tier: Tier }>,
  lowerTier: string[],
): { label: string; valueCents: number } | null {
  switch (component.type) {
    case "rideCashback":
      return {
        label: `Cashback de ${Math.round(component.rate * 100)}% nas corridas`,
        valueCents: Math.round(usage.rideSpendCents * component.rate),
      };
    case "delivery":
      return {
        label: "Entrega mais barata no delivery",
        valueCents: usage.deliveriesPerMonth * usage.deliverySavingCents,
      };
    case "shipping": {
      const orders = component.store === "amazon" ? usage.amazonOrders : usage.mercadoLivreOrders;
      return {
        label: component.store === "amazon" ? "Frete na Amazon" : "Frete no Mercado Livre",
        valueCents: orders * usage.shippingSavingCents,
      };
    }
    case "streaming": {
      // Vale o preço avulso de cada streaming incluído que a pessoa quer, se o nível for o mesmo ou melhor.
      let valueCents = 0;
      const names: string[] = [];
      for (const inc of included) {
        if (!usage.wantedStreamingIds.includes(inc.serviceId)) continue;
        const ref = findService(inc.serviceId);
        if (!ref || ref.category !== "video") continue;
        if (TIER_RANK[inc.tier] >= TIER_RANK[ref.tier]) {
          valueCents += ref.monthlyCents;
          names.push(ref.name);
        } else {
          lowerTier.push(inc.serviceId);
        }
      }
      return names.length ? { label: `Streaming incluído: ${names.join(", ")}`, valueCents } : null;
    }
  }
}

/** Quanto do uso principal faltaria para a assinatura se pagar, dado o valor dos outros componentes. */
function breakEvenFor(
  components: ValueComponent[],
  usage: Usage,
  priceCents: number,
  breakdown: PayoffItem["breakdown"],
): BreakEven | null {
  const main = components.find((c) => c.type !== "streaming");
  if (!main) return null;
  const mainValue = componentValueOnly(main, usage);
  const others = breakdown.reduce((t, b) => t + b.valueCents, 0) - mainValue;
  const missing = Math.max(0, priceCents - others);
  switch (main.type) {
    case "rideCashback":
      return { usage: "rideSpendCents", needed: Math.ceil(missing / main.rate) };
    case "delivery":
      return usage.deliverySavingCents > 0
        ? { usage: "deliveriesPerMonth", needed: Math.ceil(missing / usage.deliverySavingCents) }
        : null;
    case "shipping":
      return usage.shippingSavingCents > 0
        ? {
            usage: main.store === "amazon" ? "amazonOrders" : "mercadoLivreOrders",
            needed: Math.ceil(missing / usage.shippingSavingCents),
          }
        : null;
  }
}

function componentValueOnly(
  component: Exclude<ValueComponent, { type: "streaming" }>,
  usage: Usage,
) {
  switch (component.type) {
    case "rideCashback":
      return Math.round(usage.rideSpendCents * component.rate);
    case "delivery":
      return usage.deliveriesPerMonth * usage.deliverySavingCents;
    case "shipping":
      return (
        (component.store === "amazon" ? usage.amazonOrders : usage.mercadoLivreOrders) *
        usage.shippingSavingCents
      );
  }
}
