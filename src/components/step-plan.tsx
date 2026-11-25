"use client";

import type { CSSProperties } from "react";
import type { Action, ActionKind } from "@/lib/actions";
import { findService } from "@/lib/catalog/services";
import { brl, brlRound, monthLabel } from "@/lib/format";
import type { OptimizeResult } from "@/lib/optimize";
import type { PayoffReport } from "@/lib/payoff";
import { CountUp } from "./count-up";
import { ServiceBadge, serviceColor } from "./service-style";

const KIND: Record<ActionKind, { label: string; tone: string }> = {
  cancel: { label: "Cancelar", tone: "bg-bad-soft text-bad" },
  rotate: { label: "Revezar", tone: "bg-accent-soft text-accent" },
  switch: { label: "Trocar", tone: "bg-accent-soft text-accent" },
  subscribe: { label: "Assinar", tone: "bg-good-soft text-good" },
  option: { label: "Opção", tone: "bg-warn-soft text-warn" },
};

export function StepPlan({
  result,
  payoff,
  actions,
  total,
  done,
  onToggleDone,
}: {
  result: OptimizeResult;
  payoff: PayoffReport;
  actions: Action[];
  total: number;
  done: ReadonlySet<string>;
  onToggleDone: (id: string) => void;
}) {
  const counted = actions.filter((a) => a.counted);
  const doneCents = counted.filter((a) => done.has(a.id)).reduce((t, a) => t + a.yearlyCents, 0);
  const options = actions.filter((a) => !a.counted);

  return (
    <div className="flex flex-col gap-8">
      <Hero result={result} total={total} doneCents={doneCents} />

      <section>
        <h2 className="font-display text-xl font-bold">O que fazer agora</h2>
        <p className="text-sm text-muted">Da maior economia para a menor. Marque o que já fez.</p>
        {counted.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-5 text-muted">
            Nada para mudar com o que você marcou. Volte ao passo 1 e marque mais assinaturas.
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {counted.map((a, i) => (
              <ActionCard
                key={a.id}
                action={a}
                index={i}
                done={done.has(a.id)}
                onToggle={() => onToggleDone(a.id)}
              />
            ))}
          </ol>
        )}
        {options.length > 0 && (
          <details className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <summary className="cursor-pointer font-semibold">
              Outras opções ({options.length}){" "}
              <span className="font-normal text-muted">· fora do total</span>
            </summary>
            <ul className="mt-3 flex flex-col gap-3">
              {options.map((a, i) => (
                <ActionCard key={a.id} action={a} index={i} />
              ))}
            </ul>
          </details>
        )}
      </section>

      <Calendar result={result} />
      <PayoffMeters payoff={payoff} />
    </div>
  );
}

function Hero({
  result,
  total,
  doneCents,
}: {
  result: OptimizeResult;
  total: number;
  doneCents: number;
}) {
  const max = Math.max(result.currentCents, 1);
  // Mesma conta do título: o custo de hoje menos tudo o que as ações economizam ou devolvem.
  const after = Math.max(0, result.currentCents - Math.max(0, total));
  const progress = total > 0 ? Math.min(100, (doneCents / total) * 100) : 0;
  return (
    // Bloco sempre escuro (nos dois temas), para o número da economia ser o ponto alto da tela.
    <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#191c38,#2b2378)] p-6 text-white sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#7b6dff] opacity-40 blur-3xl"
      />
      <p className="relative text-sm font-semibold uppercase tracking-widest opacity-70">
        Seu plano
      </p>
      <h2 className="relative mt-2 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
        Você pode economizar{" "}
        <CountUp value={Math.max(0, total)} format={brlRound} className="text-[#6ee7a8]" />
        <span className="text-xl font-bold opacity-70 sm:text-2xl"> por ano</span>
      </h2>

      <div className="relative mt-6 grid gap-3 text-sm">
        <Bar
          label="Assinaturas hoje"
          value={result.currentCents}
          max={max}
          color="rgb(255 255 255 / 0.45)"
        />
        <Bar label="Com o plano" value={after} max={max} color="#9b91ff" />
        <p className="text-xs opacity-60">
          Já descontando o que as assinaturas devolvem: cashback, frete e entrega mais baratos.
        </p>
      </div>

      {total > 0 && (
        <div className="relative mt-6">
          <div className="flex justify-between text-xs opacity-80">
            <span>Você já garantiu</span>
            <span className="font-mono">
              {brlRound(doneCents)} de {brlRound(total)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#6ee7a8] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3">
      <span className="opacity-80">{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
      <span className="font-mono">{brlRound(value)}/ano</span>
    </div>
  );
}

function ActionCard({
  action,
  index,
  done,
  onToggle,
}: {
  action: Action;
  index: number;
  done?: boolean;
  onToggle?: () => void;
}) {
  const k = KIND[action.kind];
  return (
    <li
      style={
        {
          animationDelay: `${index * 60}ms`,
          "--svc": serviceColor(action.subjectId),
        } as CSSProperties
      }
      className={`animate-rise flex gap-4 rounded-2xl border border-line bg-surface p-4 transition-opacity ${done ? "opacity-55" : ""}`}
    >
      <ServiceBadge id={action.subjectId} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${k.tone}`}
          >
            {k.label}
          </span>
          <h3 className={`font-semibold ${done ? "line-through" : ""}`}>{action.title}</h3>
        </div>
        <p className="mt-1 text-sm text-muted">{action.detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <span className="font-mono text-sm font-bold text-good">
          +{brlRound(action.yearlyCents)}/ano
        </span>
        {onToggle && (
          <button
            type="button"
            aria-pressed={done}
            onClick={onToggle}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-good hover:text-good aria-pressed:border-good aria-pressed:bg-good aria-pressed:text-[var(--surface)]"
          >
            {done ? "Feito ✓" : "Marcar feito"}
          </button>
        )}
      </div>
    </li>
  );
}

function Calendar({ result }: { result: OptimizeResult }) {
  const { rotation } = result;
  const always = [...rotation.alwaysOnServiceIds, ...rotation.annualServiceIds];
  const name = (id: string) => findService(id)?.name ?? id;
  return (
    <section>
      <h2 className="font-display text-xl font-bold">Calendário do rodízio</h2>
      <p className="text-sm text-muted">
        Um streaming por mês. Assine no dia 1, cancele no dia 2: o acesso vai até o fim do mês pago.
      </p>
      <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {rotation.months.map((m, i) => {
          const id = m.serviceIds[0];
          return (
            <li
              key={m.month}
              style={
                {
                  animationDelay: `${i * 35}ms`,
                  "--svc": id ? serviceColor(id) : "var(--line)",
                } as CSSProperties
              }
              className="animate-rise flex min-h-24 flex-col justify-between rounded-2xl border border-[color-mix(in_srgb,var(--svc)_45%,transparent)] bg-[color-mix(in_srgb,var(--svc)_10%,var(--surface))] p-3 transition-transform hover:-translate-y-0.5"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {monthLabel(m.month)}
              </span>
              {id ? (
                <span className="flex items-center gap-2">
                  <ServiceBadge id={id} size="sm" />
                  <span className="truncate text-sm font-semibold">
                    {m.serviceIds.map(name).join(" + ")}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted">{always.length ? "—" : "Pausa"}</span>
              )}
            </li>
          );
        })}
      </ol>
      {(always.length > 0 || result.coveredByBundles.length > 0) && (
        <p className="mt-3 text-sm text-muted">
          {always.length > 0 && <>O ano todo: {always.map(name).join(", ")}. </>}
          {result.coveredByBundles.length > 0 && (
            <>Já vem nos seus pacotes: {result.coveredByBundles.map(name).join(", ")}.</>
          )}
        </p>
      )}
    </section>
  );
}

function PayoffMeters({ payoff }: { payoff: PayoffReport }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold">Cada assinatura se paga?</h2>
      <p className="text-sm text-muted">
        Quanto cada uma devolve com o seu uso, comparado com o preço.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {payoff.items.map((it) => {
          const pct = Math.min(100, (it.valueCents / it.priceCents) * 100);
          const color =
            it.verdict === "pays"
              ? "var(--good)"
              : it.verdict === "almost"
                ? "var(--warn)"
                : "var(--muted)";
          return (
            <li key={it.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <ServiceBadge id={it.id} size="sm" />
                <span className="flex-1 font-semibold">
                  {it.name}
                  {it.held && (
                    <span className="ml-2 text-xs font-normal text-muted">você assina</span>
                  )}
                </span>
                <span className="text-xs font-bold" style={{ color }}>
                  {it.verdict === "pays"
                    ? "Se paga"
                    : it.verdict === "almost"
                      ? "Quase"
                      : "Não compensa"}
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Devolve <span className="font-mono text-ink">{brl(it.valueCents)}</span> de{" "}
                <span className="font-mono">{brl(it.priceCents)}</span> por mês
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
