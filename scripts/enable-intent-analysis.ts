import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.appSettings.update({
    where: { id: 1 },
    data: { intentAnalysisEnabled: true },
  });
  console.log("Updated AppSettings row:");
  console.log(JSON.stringify(updated, null, 2));
}

main().finally(() => prisma.$disconnect());
