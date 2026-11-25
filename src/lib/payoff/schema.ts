import { z } from "zod";

const cents = z.number().int().min(0).max(1_000_000);
const count = z.number().int().min(0).max(500);

/** Valida o uso informado pela pessoa. */
export const usageSchema = z.object({
  rideSpendCents: cents,
  deliveriesPerMonth: count,
  deliverySavingCents: cents.max(10_000),
  mercadoLivreOrders: count,
  amazonOrders: count,
  shippingSavingCents: cents.max(10_000),
  wantedStreamingIds: z.array(z.string().min(1).max(64)).max(30),
});
