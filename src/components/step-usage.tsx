"use client";

import type { CSSProperties } from "react";
import { brl } from "@/lib/format";
import { ServiceBadge, serviceColor } from "./service-style";
import type { UsageNumbers } from "./state";

interface Field {
  key: keyof UsageNumbers;
  label: string;
  min: number;
  max: number;
  step: number;
  money: boolean;
  unit?: [string, string];
}

const GROUPS: Array<{ id: string; title: string; hint: string; fields: Field[] }> = [
  {
    id: "uber-one",
    title: "Corridas de app",
    hint: "Uber e parecidos. Some um mês típico.",
    fields: [
      {
        key: "rideSpendCents",
        label: "Gasto com corridas por mês",
        min: 0,
        max: 80_000,
        step: 1000,
        money: true,
      },
    ],
  },
  {
    id: "ifood-clube",
    title: "Delivery",
    hint: "Pedidos de comida, mercado e farmácia.",
    fields: [
      {
        key: "deliveriesPerMonth",
        label: "Pedidos por mês",
        min: 0,
        max: 30,
        step: 1,
        money: false,
        unit: ["pedido", "pedidos"],
      },
      {
        key: "deliverySavingCents",
        label: "Taxa de entrega média",
        min: 0,
        max: 1500,
        step: 50,
        money: true,
      },
    ],
  },
  {
    id: "meli-essencial",
    title: "Compras online",
    hint: "Para saber se o frete grátis de um clube compensa.",
    fields: [
      {
        key: "mercadoLivreOrders",
        label: "Compras no Mercado Livre por mês",
        min: 0,
        max: 20,
        step: 1,
        money: false,
        unit: ["compra", "compras"],
      },
      {
        key: "amazonOrders",
        label: "Compras na Amazon por mês",
        min: 0,
        max: 20,
        step: 1,
        money: false,
        unit: ["compra", "compras"],
      },
      {
        key: "shippingSavingCents",
        label: "Frete médio por compra",
        min: 0,
        max: 4000,
        step: 100,
        money: true,
      },
    ],
  },
];

export function StepUsage({
  usage,
  onChange,
}: {
  usage: UsageNumbers;
  onChange: (u: UsageNumbers) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {GROUPS.map((g) => (
        <section
          key={g.id}
          style={{ "--svc": serviceColor(g.id) } as CSSProperties}
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <div className="flex items-center gap-3">
            <ServiceBadge id={g.id} />
            <div>
              <h2 className="font-display text-lg font-bold">{g.title}</h2>
              <p className="text-sm text-muted">{g.hint}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-6">
            {g.fields.map((f) => {
              const v = usage[f.key];
              const shown = f.money ? brl(v) : `${v} ${v === 1 ? f.unit?.[0] : f.unit?.[1]}`;
              const pct = ((v - f.min) / (f.max - f.min)) * 100;
              return (
                <label key={f.key} className="block">
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted">{f.label}</span>
                    <span className="font-mono text-base font-bold text-ink">{shown}</span>
                  </span>
                  <input
                    id={`usage-${f.key}`}
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={v}
                    onChange={(e) => onChange({ ...usage, [f.key]: Number(e.target.value) })}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full"
                    style={{
                      background: `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-2) ${pct}%)`,
                    }}
                  />
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
