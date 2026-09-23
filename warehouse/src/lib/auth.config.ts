import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Node-only providers here — see auth.ts for the
// Credentials provider, which needs bcrypt/Prisma and cannot run in
// middleware). Unlike Service-Provider, every page under /dashboard here
// is open to both roles this app serves (ADMIN, WAREHOUSE_ATTENDANT) — no
// per-section admin-only carve-out is needed, since Companies/Users/Audit
// Log/Reports all live in Service-Provider instead.
export const authConfig = {
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
