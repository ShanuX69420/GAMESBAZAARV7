import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const emailArg = process.argv[2]?.trim().toLowerCase();

if (!emailArg) {
  console.error("Usage: npm run make-admin -- <user-email>");
  process.exit(1);
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

try {
  const updatedUser = await prisma.user.update({
    where: { email: emailArg },
    data: {
      role: "ADMIN",
      sessionVersion: { increment: 1 },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log(
    `Promoted ${updatedUser.email} (${updatedUser.id}) to ${updatedUser.role}.`,
  );
} catch {
  console.error(
    "Failed to promote user. Make sure the email exists in your database.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
