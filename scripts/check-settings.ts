import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const s = await prisma.appSettings.findUnique({ where: { id: 1 } });
  console.log(JSON.stringify(s, null, 2));
}

main().finally(() => prisma.$disconnect());
