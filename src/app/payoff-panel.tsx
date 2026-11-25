"use client";

import type { BreakEven, PayoffReport, Usage, Verdict } from "@/lib/payoff";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Uso inicial da demonstração: alguém que pede delivery e anda de Uber de vez em quando. */
export const INITIAL_USAGE: Omit<Usage, "wantedStreamingIds"> = {
  rideSpendCents: 15_000,
  deliveriesPerMonth: 4,
  deliverySavingCents: 600,
  mercadoLivreOrders: 1,
  amazonOrders: 0,
  shippingSavingCents: 1500,
};

type UsageNumbers = typeof INITIAL_USAGE;

const FIELDS: Array<{ key: keyof UsageNumbers; label: string; money: boolean }> = [
  { key: "rideSpendCents", label: "Gasto com corridas por mês", money: true },
  { key: "deliveriesPerMonth", label: "Pedidos de delivery por mês", money: false },
  { key: "deliverySavingCents", label: "Taxa de entrega média", money: true },
  { key: "mercadoLivreOrders", label: "Compras no Mercado Livre por mês", money: false },
  { key: "amazonOrders", label: "Compras na Amazon por mês", money: false },
  { key: "shippingSavingCents", label: "Frete médio por compra", money: true },
];

export function UsageForm({
  usage,
  onChange,
}: {
  usage: UsageNumbers;
  onChange: (next: UsageNumbers) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <label
          key={f.key}
          className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
        >
          <span>{f.label}</span>
          <span className="flex items-center gap-1 text-neutral-500">
            {f.money && "R$"}
            <input
              id={`usage-${f.key}`}
              type="number"
              min={0}
              step={f.money ? 0.01 : 1}
              className="w-20 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-right tabular-nums text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
              value={f.money ? (usage[f.key] / 100).toFixed(2) : usage[f.key]}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                const v = Number.isFinite(raw) && raw >= 0 ? raw : 0;
                onChange({ ...usage, [f.key]: f.money ? Math.round(v * 100) : Math.round(v) });
              }}
            />
          </span>
        </label>
      ))}
    </div>
  );
}

const VERDICT: Record<Verdict, { label: string; className: string }> = {
  pays: {
    label: "Se paga",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
  },
  almost: {
    label: "Quase",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
  },
  no: {
    label: "Não compensa",
    className: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
};

function breakEvenText(be: BreakEven | null): string | null {
  if (!be) return null;
  // Os outros benefícios já cobrem o preço: não depende do uso principal.
  if (be.needed === 0) return "Já se paga com os outros benefícios que você usa.";
  switch (be.usage) {
    case "rideSpendCents":
      return `Se paga a partir de ${brl(be.needed)} em corridas por mês.`;
    case "deliveriesPerMonth":
      return `Se paga com ${be.needed} pedido${be.needed > 1 ? "s" : ""} por mês.`;
    case "mercadoLivreOrders":
      return `Se paga com ${be.needed} compra${be.needed > 1 ? "s" : ""} por mês no Mercado Livre.`;
    case "amazonOrders":
      return `Se paga com ${be.needed} compra${be.needed > 1 ? "s" : ""} por mês na Amazon.`;
  }
}

export function PayoffList({ report }: { report: PayoffReport }) {
  const name = (id: string) => report.items.find((i) => i.id === id)?.name ?? id;
  return (
    <div className="mt-2">
      {(report.subscribe.length > 0 || report.cancel.length > 0 || report.switches.length > 0) && (
        <ul className="mb-3 flex flex-col gap-2 text-sm">
          {report.cancel.map((id) => (
            <li
              key={`cancel-${id}`}
              className="rounded-xl border-l-4 border-red-500 bg-red-50 p-3 dark:bg-red-950/50"
            >
              <strong className="font-semibold">Não se paga:</strong> com o seu uso, o {name(id)}{" "}
              custa mais do que devolve. Vale cancelar.
            </li>
          ))}
          {report.switches.map((s) => (
            <li
              key={`switch-${s.from}`}
              className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 p-3 dark:bg-indigo-950/50"
            >
              <strong className="font-semibold">Troca que compensa:</strong> trocar o {name(s.from)}{" "}
              pelo {name(s.to)} sobra mais{" "}
              <span className="tabular-nums">{brl(s.extraNetCents)}</span> por mês com o seu uso.
            </li>
          ))}
          {report.subscribe.map((id) => (
            <li
              key={`sub-${id}`}
              className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/50"
            >
              <strong className="font-semibold">Vale assinar:</strong> o {name(id)} se paga com o
              seu uso e sobra{" "}
              <span className="tabular-nums">
                {brl(report.items.find((i) => i.id === id)?.netCents ?? 0)}
              </span>{" "}
              por mês.
            </li>
          ))}
        </ul>
      )}
      <ul className="flex flex-col gap-2">
        {report.items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {item.name}
                {item.held && <span className="ml-2 text-xs text-neutral-500">(você assina)</span>}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${VERDICT[item.verdict].className}`}
              >
                {VERDICT[item.verdict].label}
              </span>
            </div>
            <p className="mt-1 tabular-nums text-neutral-600 dark:text-neutral-400">
              Custa {brl(item.priceCents)} · devolve {brl(item.valueCents)} ·{" "}
              {item.netCents >= 0 ? "sobra" : "falta"} {brl(Math.abs(item.netCents))} por mês
            </p>
            {item.breakdown.length > 0 && (
              <p className="text-xs text-neutral-500">
                {item.breakdown.map((b) => `${b.label}: ${brl(b.valueCents)}`).join(" · ")}
              </p>
            )}
            {breakEvenText(item.breakEven) && (
              <p className="text-xs text-neutral-500">{breakEvenText(item.breakEven)}</p>
            )}
            {item.lowerTierStreamingIds.length > 0 && (
              <p className="text-xs text-neutral-500">
                Não conta: {item.lowerTierStreamingIds.length} streaming
                {item.lowerTierStreamingIds.length > 1 ? "s" : ""} vem com anúncios, abaixo do seu
                plano.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
