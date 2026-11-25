import { z } from "zod";

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato AAAA-MM");
const cents = z.number().int().min(0).max(100_000);
const id = z.string().min(1).max(64);

export const userServiceSchema = z.object({
  serviceId: id,
  monthlyCents: cents.min(1),
  annualMonthlyCents: cents.min(1).nullish(),
  billing: z.enum(["direct", "apple", "google", "carrier", "other"]),
});

export const watchItemSchema = z
  .object({
    id,
    title: z.string().min(1).max(200),
    serviceIds: z.array(id).max(20),
    hours: z.number().positive().max(1000),
    releaseMonth: yearMonth.nullish(),
    leavingMonth: yearMonth.nullish(),
  })
  .refine(
    (item) => !item.releaseMonth || !item.leavingMonth || item.releaseMonth <= item.leavingMonth,
    {
      message: "A estreia não pode ser depois da saída do catálogo",
    },
  );

/** Valida a entrada do motor. Use em toda rota que recebe dados do usuário. */
export const rotationInputSchema = z.object({
  services: z
    .array(userServiceSchema)
    .max(30)
    .refine((list) => new Set(list.map((s) => s.serviceId)).size === list.length, {
      message: "Serviço repetido",
    }),
  watchlist: z.array(watchItemSchema).max(500),
  options: z.object({
    startMonth: yearMonth,
    months: z.number().int().min(1).max(24).optional(),
    concurrent: z.union([z.literal(1), z.literal(2)]).optional(),
    useAnnual: z.boolean().optional(),
    hoursPerMonth: z.number().positive().max(300).optional(),
    coveredServiceIds: z.array(id).max(30).optional(),
  }),
});
