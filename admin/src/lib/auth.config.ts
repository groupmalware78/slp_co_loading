import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Node-only providers here — see auth.ts for the
// Credentials provider, which needs bcrypt/Prisma and cannot run in middleware).
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

      // Every /dashboard/** page is ADMIN-only now — package
      // logging/editing (the one section WAREHOUSE_ATTENDANT could reach)
      // moved to the Warehouse app.
      if (isOnDashboard) {
        return isLoggedIn && auth.user.role === "ADMIN";
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
