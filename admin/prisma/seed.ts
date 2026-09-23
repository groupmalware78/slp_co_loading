import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password#123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@yseja.com" },
    update: {},
    create: {
      name: "Yse Admin",
      email: "admin@yseja.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seed complete:", { admin: admin.email });
  console.log("Password: Password#123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
