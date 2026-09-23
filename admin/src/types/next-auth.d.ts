import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

// "next-auth/jwt" re-exports its JWT type from "@auth/core/jwt" via `export *`,
// which does not participate in declaration merging — augment the source too.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
