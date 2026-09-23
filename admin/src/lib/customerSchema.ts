import { z } from "zod";
import { PHONE_FORMAT_REGEX } from "./phoneFormat";

const asString = (v: unknown) => (typeof v === "string" ? v : "");

export const customerSchema = z.object({
  name: z.preprocess(asString, z.string().trim().min(1, "Customer name is required").max(150)),
  email: z.preprocess(
    asString,
    z.string().trim().min(1, "Customer email is required").email("Enter a valid email address")
  ),
  phone: z.preprocess(
    asString,
    z
      .string()
      .trim()
      .max(50)
      .optional()
      .refine((v) => !v || PHONE_FORMAT_REGEX.test(v), {
        message: "Enter a phone number in the format +1 (000) 000-0000",
      })
  ),
  trn: z.preprocess(asString, z.string().trim().max(20).optional()),
  companyId: z.preprocess(asString, z.string().trim().min(1).optional()),
});
