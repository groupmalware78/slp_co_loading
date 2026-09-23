import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { isApiError } from "@/lib/apiErrors";
import { authConfig } from "./auth.config";
import { apiClient } from "./apiClient";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        try {
          const { user } = await apiClient.auth.login(email, password);
          if (!user.active) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
          };
        } catch (err) {
          // Invalid credentials (401) or tenant not configured — either
          // way, NextAuth expects null rather than a thrown error here.
          if (isApiError(err)) return null;
          throw err;
        }
      },
    }),
  ],
});
