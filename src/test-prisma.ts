import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const clients = await (prisma as any).client.findMany();
    console.log('Successfully connected and queried clients:', clients.length);
  } catch (error) {
    console.error('Error connecting to DB with Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
