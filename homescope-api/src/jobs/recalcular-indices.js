// Encola el recálculo del Índice de Conveniencia (RNF-13). Lo procesa el worker de la API, que debe
// estar corriendo. Cada propiedad gasta hasta 6 consultas a Google Places.
//
//   npm run indice:recalcular                → todas las publicadas con coordenadas
//   npm run indice:recalcular -- 45 47 49    → solo esas propiedades
import { prisma } from '../config/prisma.js';
import { jobs } from '../shared/adapters/jobs.adapter.js';
import { CALCULAR_INDICE, OPCIONES_CALCULAR_INDICE } from './trabajos.js';

const idsPedidos = process.argv.slice(2).map(Number).filter(Number.isInteger);

const propiedades = await prisma.propiedad.findMany({
  where: {
    estado: 'publicado',
    latitud: { not: null },
    longitud: { not: null },
    ...(idsPedidos.length && { id: { in: idsPedidos } }),
  },
  select: { id: true },
  orderBy: { id: 'asc' },
});

let encoladas = 0;
for (const { id } of propiedades) {
  // null: ya había un cálculo pendiente para esa propiedad
  if (await jobs.enqueue(CALCULAR_INDICE, { propiedadId: id }, OPCIONES_CALCULAR_INDICE(id))) encoladas++;
}

const omitidas = idsPedidos.filter((id) => !propiedades.some((p) => p.id === id));
console.log(`${encoladas} cálculos encolados (${propiedades.length - encoladas} ya estaban pendientes)`);
if (omitidas.length) console.log(`Omitidas por no estar publicadas o no tener coordenadas: ${omitidas.join(', ')}`);

await jobs.detener();
await prisma.$disconnect();
