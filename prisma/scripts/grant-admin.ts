import { PrismaClient } from '@prisma/client';

// Admin role assignment is deliberately a CLI script, never an endpoint
// (.docs/07-auth.md §4: "manual database assignment" — self-service admin
// grants are the one shortcut this app never takes). Usage:
//   pnpm admin:grant -- seller@example.com
const main = async (): Promise<void> => {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: pnpm admin:grant -- <email>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    });
    console.log(`Granted admin role to ${user.email} (${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
