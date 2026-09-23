import { z } from "zod";
import { PHONE_FORMAT_REGEX } from "./phoneFormat";

const asString = (v: unknown) => (typeof v === "string" ? v : "");

// Shared by create (POST) and edit (PATCH) — company code is auto-generated
// and never part of this input.
export const companySchema = z.object({
  name: z.preprocess(asString, z.string().trim().min(1, "Company name is required").max(150)),
  contactName: z.preprocess(asString, z.string().trim().min(1, "Contact name is required").max(150)),
  contactEmail: z.preprocess(
    asString,
    z.string().trim().min(1, "Contact email is required").email("Enter a valid email address")
  ),
  contactPhone: z.preprocess(
    asString,
    z
      .string()
      .trim()
      .min(1, "Contact phone is required")
      .refine((v) => PHONE_FORMAT_REGEX.test(v), {
        message: "Enter a phone number in the format +1 (000) 000-0000",
      })
  ),
  address: z.preprocess(asString, z.string().trim().max(300).optional()),
  active: z.boolean().optional(),
});
