import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Creates the single initial ADMIN account — nothing else. Every other
// record (companies, portal users, packages) is created through the app's
// normal flows, so this is safe to run against production.
//
// Credentials come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (and
// optionally SEED_ADMIN_NAME). Outside production they fall back to a
// local dev login; in production they're required, so a known default
// password can never end up on a live database.
//
// Idempotent: if any ADMIN user already exists it does nothing, so
// re-running it never creates a second admin or resets a password.
const isProduction = process.env.NODE_ENV === "production";

const DEV_DEFAULTS = {
  email: "admin@chosenlogisticsltd.com",
  password: "Password#123",
  name: "Shawna Prince",
};

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? (isProduction ? undefined : DEV_DEFAULTS.email);
  const password =
    process.env.SEED_ADMIN_PASSWORD ?? (isProduction ? undefined : DEV_DEFAULTS.password);
  const name = process.env.SEED_ADMIN_NAME ?? DEV_DEFAULTS.name;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required when NODE_ENV=production."
    );
  }
  if (isProduction && password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters in production.");
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { email: true },
  });
  if (existingAdmin) {
    console.log(`Seed skipped — an admin already exists (${existingAdmin.email}).`);
    return;
  }

  const admin = await prisma.user.create({
    data: {
      name,
      email: email.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });

  console.log("Seed complete:", { admin: admin.email });
  if (!isProduction && !process.env.SEED_ADMIN_PASSWORD) {
    console.log(`Password: ${DEV_DEFAULTS.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
