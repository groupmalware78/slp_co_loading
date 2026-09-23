import { z } from "zod";
import { PHONE_FORMAT_REGEX } from "./phoneFormat";

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asUppercase = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : v);

// Shared by create (POST) and edit (PATCH). `code` is required at create
// time (validated explicitly in the POST route, since it's optional here
// so PATCH — which never changes an existing company's code — still
// validates without it).
export const companySchema = z.object({
  code: z.preprocess(
    asUppercase,
    z
      .string()
      .regex(/^[A-Z0-9]{2,10}$/, "Code must be 2-10 letters/numbers")
      .optional()
  ),
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
  address: z.preprocess(asString, z.string().trim().min(1, "Address is required").max(300)),
  // The only optional field — every other field above is required.
  trn: z.preprocess(asString, z.string().trim().max(50).optional()),
  active: z.boolean().optional(),
});
