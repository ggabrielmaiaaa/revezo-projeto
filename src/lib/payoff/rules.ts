/**
 * De onde vem o valor de cada assinatura, para saber se ela se paga.
 * Cada assinatura (serviço do catálogo ou pacote) soma um ou mais componentes.
 */
export type ValueComponent =
  /** Cashback sobre o gasto em corridas (ex.: Uber One, 10%). */
  | { type: "rideCashback"; rate: number }
  /** Economia na taxa de entrega de cada pedido de delivery (ex.: Clube iFood). */
  | { type: "delivery" }
  /** Frete economizado nas compras de uma loja. */
  | { type: "shipping"; store: "mercadolivre" | "amazon" }
  /** Streamings incluídos que a pessoa quer ter. */
  | { type: "streaming" };

export interface ValueRule {
  components: ValueComponent[];
  /** Assinaturas do mesmo grupo são alternativas entre si: só a melhor é recomendada. */
  group?: string;
}

export const VALUE_RULES: Record<string, ValueRule> = {
  "uber-one": { components: [{ type: "rideCashback", rate: 0.1 }], group: "mobilidade-delivery" },
  "ifood-clube": { components: [{ type: "delivery" }], group: "mobilidade-delivery" },
  "combo-uber-ifood": {
    components: [{ type: "rideCashback", rate: 0.1 }, { type: "delivery" }],
    group: "mobilidade-delivery",
  },
  "meli-essencial": { components: [{ type: "shipping", store: "mercadolivre" }], group: "meli" },
  "meli-total": {
    components: [{ type: "shipping", store: "mercadolivre" }, { type: "streaming" }],
    group: "meli",
  },
  "meli-mega": {
    components: [{ type: "shipping", store: "mercadolivre" }, { type: "streaming" }],
    group: "meli",
  },
  // No Brasil o Prime Video vem dentro do Amazon Prime: o valor é o frete + o próprio streaming.
  prime: { components: [{ type: "shipping", store: "amazon" }, { type: "streaming" }] },
};
