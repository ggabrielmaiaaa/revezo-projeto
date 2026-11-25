import type { CSSProperties } from "react";

/** Cor de cada serviço ou pacote (as variáveis --svc-* ficam em globals.css, com versão clara e escura). */
export function serviceColor(id: string): string {
  if (id.startsWith("meli")) return "var(--svc-meli)";
  if (id.startsWith("combo")) return "var(--svc-combo)";
  return `var(--svc-${id}, var(--accent))`;
}

const MONOGRAM: Record<string, string> = {
  netflix: "N",
  max: "M",
  disney: "D+",
  globoplay: "G",
  prime: "P",
  apple: "tv",
  "ifood-clube": "iF",
  "uber-one": "U1",
  "meli-essencial": "M+",
  "meli-total": "M+",
  "meli-mega": "M+",
  "combo-uber-ifood": "U+i",
};

/** Selo redondo com as iniciais na cor do serviço. Não usa logos das marcas. */
export function ServiceBadge({ id, size = "md" }: { id: string; size?: "sm" | "md" | "lg" }) {
  const dims =
    size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-12 text-sm" : "size-10 text-xs";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-display font-extrabold ${dims}`}
      style={
        {
          background: `color-mix(in srgb, ${serviceColor(id)} 18%, transparent)`,
          color: serviceColor(id),
          boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${serviceColor(id)} 55%, transparent)`,
        } as CSSProperties
      }
    >
      {MONOGRAM[id] ?? id.slice(0, 2).toUpperCase()}
    </span>
  );
}
