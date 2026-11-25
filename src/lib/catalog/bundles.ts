import type { Tier } from "./services";

/**
 * Pacotes de assinatura: um preço que inclui vários serviços.
 * Preços e composição de 2026, com fontes divergentes — confirmar nos sites oficiais antes do lançamento.
 */
export interface Bundle {
  id: string;
  name: string;
  monthlyCents: number;
  /** Serviços do catálogo incluídos e o nível de cada um. */
  includes: ReadonlyArray<{ serviceId: string; tier: Tier }>;
  /** Vantagens fora do streaming, só para exibir. */
  perks: readonly string[];
  source: string;
}

export const BUNDLES: readonly Bundle[] = [
  {
    id: "meli-essencial",
    name: "Meli+ Essencial",
    monthlyCents: 990,
    includes: [],
    perks: ["Frete grátis em produtos Meli+", "Cashback no Mercado Pago"],
    source:
      "https://canaltech.com.br/internet/meli-vale-a-pena-assinar-o-plano-do-mercado-livre-em-2026/",
  },
  {
    id: "meli-total",
    name: "Meli+ Total",
    monthlyCents: 1990,
    includes: [{ serviceId: "disney", tier: "ads" }],
    perks: ["Frete grátis em produtos Meli+", "Cashback no Mercado Pago"],
    source:
      "https://canaltech.com.br/internet/meli-vale-a-pena-assinar-o-plano-do-mercado-livre-em-2026/",
  },
  {
    // Os planos de Netflix, Disney+ e Max podem ser trocados por versões sem anúncios pagando mais (Tecnoblog).
    id: "meli-mega",
    name: "Meli+ Mega",
    monthlyCents: 7490,
    includes: [
      { serviceId: "netflix", tier: "ads" },
      { serviceId: "disney", tier: "ads" },
      { serviceId: "max", tier: "ads" },
      { serviceId: "apple", tier: "standard" },
    ],
    perks: ["Frete grátis em produtos Meli+", "Cashback no Mercado Pago"],
    source:
      "https://canaltech.com.br/internet/meli-vale-a-pena-assinar-o-plano-do-mercado-livre-em-2026/",
  },
  {
    // Combo lançado pela Uber e pelo iFood; preço citado em 2026, a confirmar no app.
    id: "combo-uber-ifood",
    name: "Uber One + Clube iFood",
    monthlyCents: 2190,
    includes: [
      { serviceId: "uber-one", tier: "standard" },
      { serviceId: "ifood-clube", tier: "standard" },
    ],
    perks: ["10% de cashback em corridas", "Desconto na entrega do iFood"],
    source:
      "https://canaltech.com.br/apps/viagens-e-delivery-com-desconto-ifood-e-uber-liberam-combo-de-assinaturas/",
  },
];

export function findBundle(id: string): Bundle | undefined {
  return BUNDLES.find((bundle) => bundle.id === id);
}
