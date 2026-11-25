import { z } from "zod";

const id = z.string().min(1).max(64);
const cents = z.number().int().min(1).max(100_000);

export const holdingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("service"),
    serviceId: id,
    tier: z.enum(["ads", "standard", "premium"]),
    monthlyCents: cents,
  }),
  z.object({ kind: z.literal("bundle"), bundleId: id, monthlyCents: cents }),
]);

/** Valida o que o usuário diz que paga hoje. Sem repetir o mesmo serviço ou pacote. */
export const holdingsSchema = z
  .array(holdingSchema)
  .max(50)
  .refine(
    (list) => {
      const keys = list.map((h) => (h.kind === "service" ? `s:${h.serviceId}` : `b:${h.bundleId}`));
      return new Set(keys).size === keys.length;
    },
    { message: "Assinatura repetida" },
  );
