import { findBundle } from "@/lib/catalog/bundles";
import { findService, TIER_LABEL } from "@/lib/catalog/services";
import { brl } from "@/lib/format";
import type { OptimizeResult } from "@/lib/optimize";
import type { PayoffReport } from "@/lib/payoff";

export type ActionKind = "cancel" | "rotate" | "switch" | "subscribe" | "option";

export interface Action {
  id: string;
  kind: ActionKind;
  title: string;
  detail: string;
  /** Quanto a ação economiza (ou rende) por ano, em centavos. */
  yearlyCents: number;
  /** Se entra no total "você pode economizar". Alternativas e opções que pioram o plano não entram. */
  counted: boolean;
  /** Serviço ou pacote principal da ação (para a cor). */
  subjectId: string;
}

const name = (id: string) => findService(id)?.name ?? findBundle(id)?.name ?? id;

/**
 * Junta tudo o que o motor encontrou numa lista única de ações, da maior economia para a menor.
 * O total das ações contadas = economia do `optimize` (dobro + rodízio) + ganhos da calculadora "se paga?".
 */
export function buildActions(result: OptimizeResult, payoff: PayoffReport): Action[] {
  const months = result.rotation.months.length || 12;
  const actions: Action[] = [];

  for (const d of result.overlaps.duplicates) {
    actions.push({
      id: `dup-${d.serviceId}`,
      kind: "cancel",
      title: `Cancele o ${name(d.serviceId)} avulso`,
      detail: `O ${name(d.bundleId)} que você já tem inclui o mesmo plano. Você está pagando duas vezes.`,
      yearlyCents: d.savingsCents * months,
      counted: true,
      subjectId: d.serviceId,
    });
  }

  const rotation = result.rotation;
  const rotationSavings = rotation.baselineCents - rotation.planCents;
  const rotating = new Set(rotation.months.flatMap((m) => m.serviceIds));
  if (rotationSavings > 0 && rotating.size > 0) {
    actions.push({
      id: "rotate",
      kind: "rotate",
      title: `Reveze ${rotating.size} streamings, um por mês`,
      detail:
        "Siga o calendário abaixo: assine no dia 1 e cancele no dia 2. O acesso continua até o fim do mês pago.",
      yearlyCents: rotationSavings,
      counted: true,
      subjectId: [...rotating][0] ?? "netflix",
    });
  }

  const item = (id: string) => payoff.items.find((i) => i.id === id);
  for (const id of payoff.cancel) {
    const it = item(id);
    if (!it) continue;
    actions.push({
      id: `payoff-cancel-${id}`,
      kind: "cancel",
      title: `Cancele o ${it.name}`,
      detail: `Com o seu uso, ele devolve ${brl(it.valueCents)} por mês e custa ${brl(it.priceCents)}.`,
      yearlyCents: -it.netCents * months,
      counted: true,
      subjectId: id,
    });
  }
  for (const s of payoff.switches) {
    actions.push({
      id: `switch-${s.from}`,
      kind: "switch",
      title: `Troque o ${name(s.from)} pelo ${name(s.to)}`,
      detail: `Com o seu uso, a troca sobra ${brl(s.extraNetCents)} a mais por mês.`,
      yearlyCents: s.extraNetCents * months,
      counted: true,
      subjectId: s.to,
    });
  }
  for (const id of payoff.subscribe) {
    const it = item(id);
    if (!it) continue;
    actions.push({
      id: `subscribe-${id}`,
      kind: "subscribe",
      title: `Vale assinar o ${it.name}`,
      detail: `Custa ${brl(it.priceCents)} e devolve ${brl(it.valueCents)} por mês com o seu uso: ${it.breakdown
        .map((b) => b.label.toLowerCase())
        .join(", ")}.`,
      yearlyCents: it.netCents * months,
      counted: true,
      subjectId: id,
    });
  }

  for (const s of result.overlaps.bundleSwaps) {
    const ads = s.downgrades.map((d) => name(d.serviceId));
    actions.push({
      id: `bundle-${s.bundleId}`,
      kind: "option",
      title: `Alternativa: ${name(s.bundleId)} no lugar de ${s.replaces.map(name).join(", ")}`,
      detail: `Sai ${brl(s.savingsCents)} por mês mais barato que pagar tudo junto${
        ads.length
          ? `, mas ${ads.join(" e ")} passa${ads.length > 1 ? "m" : ""} a ter anúncios`
          : ""
      }. Compare com o rodízio antes de trocar.`,
      yearlyCents: s.savingsCents * months,
      counted: false,
      subjectId: s.bundleId,
    });
  }
  for (const d of result.overlaps.downgradeOptions) {
    actions.push({
      id: `down-${d.serviceId}`,
      kind: "option",
      title: `Opção: use o ${name(d.serviceId)} do ${name(d.bundleId)}`,
      detail: `Ele vem ${TIER_LABEL[d.includedTier]}, abaixo do seu plano ${TIER_LABEL[d.heldTier]}. Se não se importar, cancele o avulso.`,
      yearlyCents: d.savingsCents * months,
      counted: false,
      subjectId: d.serviceId,
    });
  }

  return actions.sort(
    (a, b) => Number(b.counted) - Number(a.counted) || b.yearlyCents - a.yearlyCents,
  );
}

/** Soma o que as ações contadas economizam por ano. */
export function totalYearly(actions: Action[]): number {
  return actions.filter((a) => a.counted).reduce((t, a) => t + a.yearlyCents, 0);
}
