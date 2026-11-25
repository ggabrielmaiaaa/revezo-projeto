"use client";

import { useMemo, useState } from "react";
import { BUNDLES, findBundle } from "@/lib/catalog/bundles";
import { CATALOG, findService, TIER_LABEL, type Tier } from "@/lib/catalog/services";
import { optimize } from "@/lib/optimize";
import type { Holding } from "@/lib/overlaps";
import { evaluatePayoff } from "@/lib/payoff";
import { addMonths } from "@/lib/rotation";
import { INITIAL_USAGE, PayoffList, UsageForm } from "./payoff-panel";

const VIDEO = CATALOG.filter((s) => s.category === "video");
const OTHERS = CATALOG.filter((s) => s.category !== "video");

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const monthLabel = (month: string) =>
  `${MONTH_NAMES.at(Number(month.slice(5)) - 1)} ${month.slice(2, 4)}`;
const serviceName = (id: string) => findService(id)?.name ?? id;
const bundleName = (id: string) => findBundle(id)?.name ?? id;

interface ServiceState {
  on: boolean;
  tier: Tier;
  cents: number;
}

// Começa com um caso real: Meli+ Total + Disney+ avulso (em dobro) + Netflix e Max.
const INITIAL_SERVICES: Record<string, ServiceState> = Object.fromEntries(
  CATALOG.map((s) => [
    s.id,
    { on: ["disney", "netflix", "max"].includes(s.id), tier: s.tier, cents: s.monthlyCents },
  ]),
);
const INITIAL_BUNDLES: Record<string, boolean> = Object.fromEntries(
  BUNDLES.map((b) => [b.id, b.id === "meli-total"]),
);

export function Demo() {
  // O plano começa no mês que vem. Lê a data de hoje, por isso a página envolve a demo em <Suspense>.
  const [startMonth] = useState(() => addMonths(new Date().toISOString().slice(0, 7), 1));
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [bundles, setBundles] = useState(INITIAL_BUNDLES);
  const [usage, setUsage] = useState(INITIAL_USAGE);

  const holdings: Holding[] = useMemo(
    () => [
      ...BUNDLES.filter((b) => bundles[b.id]).map((b): Holding => ({
        kind: "bundle",
        bundleId: b.id,
        monthlyCents: b.monthlyCents,
      })),
      ...CATALOG.flatMap((s): Holding[] => {
        const st = services[s.id];
        return st?.on && st.cents > 0
          ? [{ kind: "service", serviceId: s.id, tier: st.tier, monthlyCents: st.cents }]
          : [];
      }),
    ],
    [services, bundles],
  );
  const result = useMemo(
    () => optimize({ holdings, watchlist: [], options: { startMonth } }),
    [holdings, startMonth],
  );
  const { overlaps, rotation } = result;
  // Assinaturas que a pessoa tem (para "cancelar") e streamings que ela quer (valor dos pacotes).
  const payoff = useMemo(() => {
    const heldIds = [
      ...BUNDLES.filter((b) => bundles[b.id]).map((b) => b.id),
      ...CATALOG.filter((s) => services[s.id]?.on).map((s) => s.id),
    ];
    const wantedStreamingIds = VIDEO.filter((s) => services[s.id]?.on).map((s) => s.id);
    return evaluatePayoff({ ...usage, wantedStreamingIds }, heldIds);
  }, [usage, services, bundles]);
  const hasAlerts =
    overlaps.duplicates.length + overlaps.downgradeOptions.length + overlaps.bundleSwaps.length > 0;

  const updateService = (id: string, patch: Partial<ServiceState>) =>
    setServices((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section aria-labelledby="hoje">
        <h2 id="hoje" className="text-lg font-semibold">
          O que você paga hoje
        </h2>

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Streamings avulsos
        </h3>
        <ul className="mt-2 flex flex-col gap-2">
          {VIDEO.map((s) => {
            const st = services[s.id]!;
            return (
              <li
                key={s.id}
                className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[auto_1fr_auto_auto] dark:border-neutral-800 ${st.on ? "" : "opacity-60"}`}
              >
                <input
                  id={`svc-${s.id}`}
                  type="checkbox"
                  className="size-5 accent-indigo-600"
                  checked={st.on}
                  onChange={(e) => updateService(s.id, { on: e.target.checked })}
                />
                <label htmlFor={`svc-${s.id}`} className="font-medium">
                  {s.name}
                </label>
                <select
                  aria-label={`Plano do ${s.name}`}
                  className="col-start-2 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm sm:col-start-auto dark:border-neutral-700"
                  value={st.tier}
                  onChange={(e) => updateService(s.id, { tier: e.target.value as Tier })}
                >
                  {(Object.keys(TIER_LABEL) as Tier[]).map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABEL[t]}
                    </option>
                  ))}
                </select>
                <label className="col-start-2 flex items-center gap-1 text-sm text-neutral-500 sm:col-start-auto">
                  R$
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    aria-label={`Quanto você paga pelo ${s.name}`}
                    className="w-24 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-right tabular-nums text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                    value={(st.cents / 100).toFixed(2)}
                    onChange={(e) => {
                      const v = Math.round(parseFloat(e.target.value) * 100);
                      updateService(s.id, { cents: Number.isFinite(v) && v >= 0 ? v : 0 });
                    }}
                  />
                </label>
              </li>
            );
          })}
        </ul>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Outras assinaturas
        </h3>
        <ul className="mt-2 flex flex-col gap-2">
          {OTHERS.map((s) => {
            const st = services[s.id]!;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800 ${st.on ? "" : "opacity-60"}`}
              >
                <input
                  id={`svc-${s.id}`}
                  type="checkbox"
                  className="size-5 accent-indigo-600"
                  checked={st.on}
                  onChange={(e) => updateService(s.id, { on: e.target.checked })}
                />
                <label htmlFor={`svc-${s.id}`} className="min-w-0 flex-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-sm text-neutral-500">{s.planNote}</span>
                </label>
                <span className="tabular-nums text-sm text-neutral-500">
                  {brl(s.monthlyCents)}/mês
                </span>
              </li>
            );
          })}
        </ul>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Pacotes
        </h3>
        <ul className="mt-2 flex flex-col gap-2">
          {BUNDLES.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <input
                id={`bundle-${b.id}`}
                type="checkbox"
                className="mt-0.5 size-5 accent-indigo-600"
                checked={bundles[b.id] ?? false}
                onChange={(e) => setBundles((prev) => ({ ...prev, [b.id]: e.target.checked }))}
              />
              <label htmlFor={`bundle-${b.id}`} className="min-w-0">
                <span className="font-medium">{b.name}</span>{" "}
                <span className="tabular-nums text-neutral-500">{brl(b.monthlyCents)}/mês</span>
                <span className="block text-sm text-neutral-500">
                  {b.includes.length
                    ? b.includes
                        .map((i) => `${serviceName(i.serviceId)} ${TIER_LABEL[i.tier]}`)
                        .join(" · ")
                    : "Sem streaming"}
                  {" · "}
                  {b.perks[0]}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Como você usa, num mês típico
        </h3>
        <UsageForm usage={usage} onChange={setUsage} />
      </section>

      <section aria-labelledby="resultado" aria-live="polite">
        <h2 id="resultado" className="text-lg font-semibold">
          O que o Revezo faria
        </h2>

        <dl className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <dt className="text-xs text-neutral-500">Hoje, no ano</dt>
            <dd className="mt-1 font-semibold tabular-nums">{brl(result.currentCents)}</dd>
          </div>
          <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <dt className="text-xs text-neutral-500">Com o Revezo</dt>
            <dd className="mt-1 font-semibold tabular-nums">{brl(result.plannedCents)}</dd>
          </div>
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
            <dt className="text-xs text-emerald-700 dark:text-emerald-400">Economia</dt>
            <dd className="mt-1 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {brl(Math.max(0, result.savingsCents))}
            </dd>
          </div>
        </dl>

        <ul className="mt-4 flex flex-col gap-2">
          {overlaps.duplicates.map((d) => (
            <li
              key={`dup-${d.serviceId}`}
              className="rounded-xl border-l-4 border-red-500 bg-red-50 p-3 text-sm dark:bg-red-950/50"
            >
              <strong className="font-semibold">Pago em dobro:</strong> o {bundleName(d.bundleId)}{" "}
              já inclui o {serviceName(d.serviceId)}. Cancele o avulso e economize{" "}
              <span className="tabular-nums">{brl(d.savingsCents)}</span> por mês.
            </li>
          ))}
          {overlaps.downgradeOptions.map((d) => (
            <li
              key={`down-${d.serviceId}`}
              className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-3 text-sm dark:bg-amber-950/50"
            >
              <strong className="font-semibold">Opção:</strong> o {bundleName(d.bundleId)} inclui o{" "}
              {serviceName(d.serviceId)} {TIER_LABEL[d.includedTier]}. Se aceitar isso no lugar do
              seu plano {TIER_LABEL[d.heldTier]}, economiza{" "}
              <span className="tabular-nums">{brl(d.savingsCents)}</span> por mês.
            </li>
          ))}
          {overlaps.bundleSwaps.map((s) => (
            <li
              key={`swap-${s.bundleId}`}
              className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 p-3 text-sm dark:bg-indigo-950/50"
            >
              <strong className="font-semibold">Pacote mais barato:</strong> o{" "}
              {bundleName(s.bundleId)} substitui {s.replaces.map(serviceName).join(", ")} e custa{" "}
              <span className="tabular-nums">{brl(s.savingsCents)}</span> a menos por mês que pagar
              tudo junto.
              {s.downgrades.length > 0 &&
                ` Atenção: ${s.downgrades.map((d) => serviceName(d.serviceId)).join(" e ")} passa${s.downgrades.length > 1 ? "m" : ""} a ter anúncios.`}
            </li>
          ))}
          {!hasAlerts && (
            <li className="rounded-xl border border-dashed border-neutral-300 p-3 text-sm text-neutral-500 dark:border-neutral-700">
              Nenhuma assinatura em dobro e nenhum pacote que compense com o que você marcou.
            </li>
          )}
        </ul>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Assinaturas que se pagam com o seu uso
        </h3>
        <PayoffList report={payoff} />

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Rodízio dos streamings, mês a mês
        </h3>
        {rotation.alwaysOnServiceIds.length + rotation.annualServiceIds.length > 0 && (
          <p className="mt-1 text-sm text-neutral-500">
            O ano todo:{" "}
            {[...rotation.alwaysOnServiceIds, ...rotation.annualServiceIds]
              .map(serviceName)
              .join(", ")}
            {rotation.annualServiceIds.length > 0 && " (no plano anual)"}
          </p>
        )}
        <ol className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {rotation.months.map((m) => (
            <li
              key={m.month}
              className="rounded-xl border border-neutral-200 p-2.5 dark:border-neutral-800"
            >
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {monthLabel(m.month)}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold">
                {m.serviceIds.map(serviceName).join(" + ") ||
                  (rotation.alwaysOnServiceIds.length ? "—" : "Pausa")}
              </p>
            </li>
          ))}
        </ol>
        {result.coveredByBundles.length > 0 && (
          <p className="mt-3 text-sm text-neutral-500">
            Já vem nos seus pacotes, fora do rodízio:{" "}
            {result.coveredByBundles.map(serviceName).join(", ")}.
          </p>
        )}
      </section>
    </div>
  );
}
