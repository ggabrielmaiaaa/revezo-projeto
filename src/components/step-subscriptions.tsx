"use client";

import type { CSSProperties, ReactNode } from "react";
import { BUNDLES } from "@/lib/catalog/bundles";
import { findService, TIER_LABEL, type CatalogService, type Tier } from "@/lib/catalog/services";
import { brl } from "@/lib/format";
import { ServiceBadge, serviceColor } from "./service-style";
import { OTHERS, VIDEO, type BundlesState, type ServiceState, type ServicesState } from "./state";

const TIERS = Object.keys(TIER_LABEL) as Tier[];

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
        on
          ? "scale-100 border-transparent bg-[var(--svc)] text-[var(--surface)]"
          : "border-line text-transparent"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

function Card({
  id,
  on,
  onToggle,
  title,
  subtitle,
  children,
}: {
  id: string;
  on: boolean;
  onToggle: () => void;
  title: string;
  subtitle: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      style={{ "--svc": serviceColor(id) } as CSSProperties}
      className={`overflow-hidden rounded-2xl border bg-surface transition-all duration-200 ${
        on
          ? "border-transparent shadow-[0_0_0_2px_var(--svc),0_8px_24px_-12px_var(--svc)]"
          : "border-line hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--svc)_50%,var(--line))]"
      }`}
    >
      <button
        type="button"
        aria-pressed={on}
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <ServiceBadge id={id} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-muted">{subtitle}</span>
        </span>
        <Check on={on} />
      </button>
      {on && children}
    </div>
  );
}

function ServiceCard({
  service,
  state,
  onChange,
  withTier,
}: {
  service: CatalogService;
  state: ServiceState;
  onChange: (patch: Partial<ServiceState>) => void;
  withTier: boolean;
}) {
  return (
    <Card
      id={service.id}
      on={state.on}
      onToggle={() => onChange({ on: !state.on })}
      title={service.name}
      subtitle={`${brl(service.monthlyCents)}/mês · ${service.planNote}`}
    >
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-2/60 px-4 py-3">
        {withTier && (
          <div
            role="group"
            aria-label={`Plano do ${service.name}`}
            className="flex rounded-full bg-surface p-0.5 text-xs"
          >
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={state.tier === t}
                onClick={() => onChange({ tier: t })}
                className="rounded-full px-2.5 py-1 font-medium text-muted transition-colors aria-pressed:bg-[var(--svc)] aria-pressed:text-[var(--surface)]"
              >
                {TIER_LABEL[t]}
              </button>
            ))}
          </div>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-sm text-muted">
          Você paga R$
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            aria-label={`Quanto você paga pelo ${service.name}, por mês`}
            className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-right font-mono text-ink"
            value={(state.cents / 100).toFixed(2)}
            onChange={(e) => {
              const v = Math.round(parseFloat(e.target.value) * 100);
              onChange({ cents: Number.isFinite(v) && v >= 0 ? v : 0 });
            }}
          />
        </label>
      </div>
    </Card>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted">{hint}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function StepSubscriptions({
  services,
  bundles,
  onService,
  onBundle,
}: {
  services: ServicesState;
  bundles: BundlesState;
  onService: (id: string, patch: Partial<ServiceState>) => void;
  onBundle: (id: string, on: boolean) => void;
}) {
  return (
    <div>
      <Section
        title="Streaming"
        hint="Toque para marcar o que você assina. Ajuste o plano e o preço se forem diferentes."
      >
        {VIDEO.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            state={services[s.id]!}
            onChange={(p) => onService(s.id, p)}
            withTier
          />
        ))}
      </Section>

      <Section
        title="Delivery e mobilidade"
        hint="Clubes e assinaturas de apps que você usa no dia a dia."
      >
        {OTHERS.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            state={services[s.id]!}
            onChange={(p) => onService(s.id, p)}
            withTier={false}
          />
        ))}
      </Section>

      <Section title="Pacotes" hint="Assinaturas que juntam vários serviços num preço só.">
        {BUNDLES.map((b) => (
          <Card
            key={b.id}
            id={b.id}
            on={bundles[b.id] ?? false}
            onToggle={() => onBundle(b.id, !bundles[b.id])}
            title={b.name}
            subtitle={
              <>
                {brl(b.monthlyCents)}/mês
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {b.includes.length === 0 && <Chip>Frete grátis</Chip>}
                  {b.includes.map((i) => (
                    <Chip key={i.serviceId}>
                      {findService(i.serviceId)?.name}
                      {i.tier === "ads" && " (anúncios)"}
                    </Chip>
                  ))}
                </span>
              </>
            }
          />
        ))}
      </Section>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
      {children}
    </span>
  );
}
