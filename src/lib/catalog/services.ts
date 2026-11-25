/**
 * Catálogo de serviços com preços de referência no Brasil (2026), em centavos.
 * Fonte: sites de comparação citados na análise; confirmar nos sites oficiais antes do lançamento.
 * `tmdbProviderId` = id do provedor na API do TMDB (região BR); conferir na etapa 4.
 */

/** Nível do plano. A ordem importa: um pacote só cobre um serviço se o nível incluído for igual ou maior. */
export type Tier = "ads" | "standard" | "premium";
export const TIER_RANK: Record<Tier, number> = { ads: 0, standard: 1, premium: 2 };
export const TIER_LABEL: Record<Tier, string> = {
  ads: "com anúncios",
  standard: "sem anúncios",
  premium: "premium",
};

export type Category = "video" | "music" | "shopping" | "delivery" | "mobility";

export interface CatalogService {
  id: string;
  name: string;
  category: Category;
  /** Nível do plano de referência (o preço abaixo é deste nível). */
  tier: Tier;
  monthlyCents: number;
  annualMonthlyCents: number | null;
  planNote: string;
  tmdbProviderId: number | null;
}

export const CATALOG: readonly CatalogService[] = [
  {
    id: "netflix",
    name: "Netflix",
    category: "video",
    tier: "standard",
    monthlyCents: 4490,
    annualMonthlyCents: null,
    planNote: "Padrão sem anúncios",
    tmdbProviderId: 8,
  },
  {
    id: "max",
    name: "Max",
    category: "video",
    tier: "standard",
    monthlyCents: 4490,
    annualMonthlyCents: null,
    planNote: "Standard sem anúncios",
    tmdbProviderId: 1899,
  },
  {
    id: "disney",
    name: "Disney+",
    category: "video",
    tier: "ads",
    monthlyCents: 2990,
    annualMonthlyCents: null,
    planNote: "Plano com anúncios",
    tmdbProviderId: 337,
  },
  {
    id: "globoplay",
    name: "Globoplay",
    category: "video",
    tier: "ads",
    monthlyCents: 2290,
    annualMonthlyCents: 1490,
    planNote: "Padrão com anúncios",
    tmdbProviderId: 307,
  },
  {
    // No Brasil o Prime Video vem dentro do Amazon Prime (com frete grátis).
    id: "prime",
    name: "Prime Video",
    category: "video",
    tier: "ads",
    monthlyCents: 1990,
    annualMonthlyCents: 1390,
    planNote: "Amazon Prime (inclui frete)",
    tmdbProviderId: 119,
  },
  {
    // Preço a confirmar: fontes de 2026 citam R$ 29,90 (O Antagonista, Oficina da Net) e R$ 34,90 (TecMundo).
    id: "apple",
    name: "Apple TV+",
    category: "video",
    tier: "standard",
    monthlyCents: 2990,
    annualMonthlyCents: null,
    planNote: "Sem anúncios",
    tmdbProviderId: 350,
  },
  {
    // Preço a confirmar: fontes de 2026 citam R$ 12,90 (iDinheiro) e R$ 24,90 (valor mais antigo).
    id: "ifood-clube",
    name: "Clube iFood",
    category: "delivery",
    tier: "standard",
    monthlyCents: 1290,
    annualMonthlyCents: null,
    planNote: "Desconto na entrega e cupons",
    tmdbProviderId: null,
  },
  {
    // Mensal R$ 24,90; anual sai R$ 19,90/mês (Cupom Online, 2026). Cashback de 10% em créditos nas corridas.
    id: "uber-one",
    name: "Uber One",
    category: "mobility",
    tier: "standard",
    monthlyCents: 2490,
    annualMonthlyCents: 1990,
    planNote: "10% de cashback em corridas",
    tmdbProviderId: null,
  },
];

export function findService(id: string): CatalogService | undefined {
  return CATALOG.find((service) => service.id === id);
}
