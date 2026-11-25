"use client";

import { useMemo, useState } from "react";
import { buildActions, totalYearly } from "@/lib/actions";
import { BUNDLES } from "@/lib/catalog/bundles";
import { CATALOG } from "@/lib/catalog/services";
import { brlRound } from "@/lib/format";
import { optimize } from "@/lib/optimize";
import type { Holding } from "@/lib/overlaps";
import { evaluatePayoff } from "@/lib/payoff";
import { addMonths } from "@/lib/rotation";
import { CountUp } from "./count-up";
import { EMPTY, EXAMPLE, VIDEO, type ServiceState } from "./state";
import { StepPlan } from "./step-plan";
import { StepSubscriptions } from "./step-subscriptions";
import { StepUsage } from "./step-usage";
import { ThemeToggle } from "./theme-toggle";

const STEPS = [
  { title: "Suas assinaturas", short: "Assinaturas", hint: "O que você paga hoje" },
  { title: "Seu uso", short: "Uso", hint: "Como você usa num mês típico" },
  { title: "Seu plano", short: "Plano", hint: "O que cancelar, trocar e assinar" },
] as const;

export function RevezoApp() {
  // O plano começa no mês que vem. Lê a data de hoje: por isso a página envolve o app em <Suspense>.
  const [startMonth] = useState(() => addMonths(new Date().toISOString().slice(0, 7), 1));
  const [step, setStep] = useState(0);
  const [services, setServices] = useState(EXAMPLE.services);
  const [bundles, setBundles] = useState(EXAMPLE.bundles);
  const [usage, setUsage] = useState(EXAMPLE.usage);
  const [isExample, setIsExample] = useState(true);
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  const { result, payoff, actions, total } = useMemo(() => {
    const holdings: Holding[] = [
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
    ];
    const result = optimize({ holdings, watchlist: [], options: { startMonth } });
    const heldIds = [
      ...BUNDLES.filter((b) => bundles[b.id]).map((b) => b.id),
      ...CATALOG.filter((s) => services[s.id]?.on).map((s) => s.id),
    ];
    const wantedStreamingIds = VIDEO.filter((s) => services[s.id]?.on).map((s) => s.id);
    const payoff = evaluatePayoff({ ...usage, wantedStreamingIds }, heldIds);
    const actions = buildActions(result, payoff);
    return { result, payoff, actions, total: totalYearly(actions) };
  }, [services, bundles, usage, startMonth]);

  const edited = () => {
    setIsExample(false);
    setDone(new Set());
  };
  const onService = (id: string, patch: Partial<ServiceState>) => {
    setServices((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
    edited();
  };
  const onBundle = (id: string, on: boolean) => {
    setBundles((prev) => ({ ...prev, [id]: on }));
    edited();
  };
  const load = (preset: typeof EXAMPLE) => {
    setServices(preset.services);
    setBundles(preset.bundles);
    setUsage(preset.usage);
    setIsExample(preset === EXAMPLE);
    setDone(new Set());
    setStep(0);
  };
  const go = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectedCount =
    CATALOG.filter((s) => services[s.id]?.on).length + BUNDLES.filter((b) => bundles[b.id]).length;

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
            <span aria-hidden="true" className="grid grid-cols-3 gap-[3px]">
              <span className="size-2 rounded-[2px] bg-[var(--svc-netflix)]" />
              <span className="size-2 rounded-[2px] bg-[var(--svc-max)]" />
              <span className="size-2 rounded-[2px] bg-[var(--svc-disney)]" />
            </span>
            Revezo
          </span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
            Teste
          </span>
          <button
            type="button"
            onClick={() => go(2)}
            className="ml-auto hidden items-center gap-2 rounded-full bg-good-soft px-3 py-1.5 text-sm font-semibold text-good transition-transform hover:scale-105 sm:flex"
            aria-label="Ver o plano"
          >
            Economia possível
            <CountUp value={Math.max(0, total)} format={brlRound} className="font-mono" />
            <span className="font-normal opacity-80">/ano</span>
          </button>
          <span className="ml-auto sm:ml-0">
            <ThemeToggle />
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-32 pt-6">
        <nav aria-label="Passos" className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => go(i)}
              aria-current={step === i ? "step" : undefined}
              className={`group min-w-0 rounded-2xl border px-2.5 py-3 text-left transition-all sm:p-3 ${
                step === i
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))]"
              }`}
            >
              <span className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    step === i
                      ? "bg-accent text-on-accent"
                      : i < step
                        ? "bg-good text-[var(--surface)]"
                        : "bg-surface-2 text-muted"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className="min-w-0 truncate font-display text-sm font-bold sm:text-base">
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.title}</span>
                </span>
              </span>
              <span className="mt-1 hidden text-xs text-muted sm:block">{s.hint}</span>
            </button>
          ))}
        </nav>

        {step === 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm">
            <span className="text-muted">
              {isExample
                ? "Preenchemos um exemplo para você ver como funciona. Troque pelas suas assinaturas."
                : `${selectedCount} ${selectedCount === 1 ? "assinatura marcada" : "assinaturas marcadas"}.`}
            </span>
            <span className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => load(EMPTY)}
                className="rounded-full border border-line px-3 py-1 font-semibold hover:border-accent hover:text-accent"
              >
                Começar do zero
              </button>
              {!isExample && (
                <button
                  type="button"
                  onClick={() => load(EXAMPLE)}
                  className="rounded-full border border-line px-3 py-1 font-semibold hover:border-accent hover:text-accent"
                >
                  Ver o exemplo
                </button>
              )}
            </span>
          </div>
        )}

        <main key={step} className="animate-rise mt-6">
          {step === 0 && (
            <StepSubscriptions
              services={services}
              bundles={bundles}
              onService={onService}
              onBundle={onBundle}
            />
          )}
          {step === 1 && (
            <StepUsage
              usage={usage}
              onChange={(u) => {
                setUsage(u);
                edited();
              }}
            />
          )}
          {step === 2 && (
            <StepPlan
              result={result}
              payoff={payoff}
              actions={actions}
              total={total}
              done={done}
              onToggleDone={(id) =>
                setDone((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            />
          )}
        </main>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="rounded-full border border-line px-5 py-2.5 font-semibold hover:border-accent hover:text-accent"
            >
              Voltar
            </button>
          ) : (
            <span className="text-sm text-muted sm:hidden">
              Economia:{" "}
              <CountUp
                value={Math.max(0, total)}
                format={brlRound}
                className="font-mono font-bold text-good"
              />
              /ano
            </span>
          )}
          <button
            type="button"
            onClick={() => go(step < 2 ? step + 1 : 0)}
            className="ml-auto rounded-full bg-accent px-6 py-2.5 font-semibold text-on-accent shadow-[0_8px_20px_-8px_var(--accent)] transition-transform hover:scale-[1.03] active:scale-95"
          >
            {step === 0 ? (
              <>
                Continuar<span className="hidden sm:inline">: seu uso</span>
              </>
            ) : step === 1 ? (
              "Ver meu plano"
            ) : (
              "Recomeçar"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
