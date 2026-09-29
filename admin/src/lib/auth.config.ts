import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Node-only providers here — see auth.ts for the
// Credentials provider, which needs bcrypt/Prisma and cannot run in middleware).
export const authConfig = {
  // Railway (and any reverse proxy) forwards requests with its own Host, so
  // Auth.js must trust the forwarded host or it rejects every auth request
  // with UntrustedHost. Set here rather than via AUTH_TRUST_HOST so it can't
  // be lost to a missing env var.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");

      // Coarse gate: any authenticated user (any role)
      // may enter /dashboard/**. Section-by-section restriction (Companies/
      // Users/Audit/Reports/Manifests/Rates/Banking staying ADMIN-only,
      // Packages open to both) is enforced per-page via lib/rbac.ts, not
      // here — see dashboard/layout.tsx and each page's own RBAC check.
      if (isOnDashboard) {
        return isLoggedIn;
      }
      if (isLoggedIn && request.nextUrl.pathname === "/login") {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
