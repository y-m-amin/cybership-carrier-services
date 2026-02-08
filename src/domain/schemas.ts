import { z } from "zod";

export const AddressSchema = z.object({
  countryCode: z.string().length(2),
  postalCode: z.string().min(1),
  stateProvince: z.string().optional(),
  city: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
});

export const PackageSchema = z.object({
  weight: z.object({
    value: z.number().positive(),
    unit: z.enum(["LB", "KG"]),
  }),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
      unit: z.enum(["IN", "CM"]),
    })
    .optional(),
});

export const RateRequestSchema = z.object({
  shipper: AddressSchema,
  recipient: AddressSchema,
  packages: z.array(PackageSchema).min(1),
  serviceLevel: z.string().optional(),
});
