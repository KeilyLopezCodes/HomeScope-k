import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // TODO: Cargar roles, permisos, tipos de propiedad y categorías de interés con sus pesos
  console.log('Seed ejecutado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
