import { z } from "zod";

export const UpsRatedShipmentSchema = z.object({
  Service: z.object({
    Code: z.string(),
    Description: z.string().optional(),
  }),
  TotalCharges: z.object({
    MonetaryValue: z.string(),
    CurrencyCode: z.string(),
  }),
  GuaranteedDelivery: z
    .object({
      BusinessDaysInTransit: z.string().optional(),
    })
    .optional(),
});

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.any().optional(),
    RatedShipment: z.array(UpsRatedShipmentSchema),
  }),
});

export type UpsRateResponse = z.infer<typeof UpsRateResponseSchema>;
