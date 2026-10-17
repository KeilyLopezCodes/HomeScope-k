/**
 * seed-indices-fake.js — Índices de Conveniencia FICTICIOS para visualizar el semáforo y el desglose
 * sin gastar consultas a Google Places.
 *
 * - Solo a propiedades publicadas, con coordenadas y sin índice vigente (las sin coordenadas siguen
 *   mostrando "Índice no disponible").
 * - Se guardan con version_algoritmo = 'fake-v1.0' para distinguirlos de los reales; no crean puntos de interés.
 * - El total se calcula con los pesos reales de categoria_interes, así el desglose cuadra con el puntaje.
 * - Son deterministas por id (re-ejecutar da los mismos valores) y se reparten entre verde, amarillo y rojo.
 * - `npm run indice:recalcular` los reemplaza por índices reales.
 *
 * Ejecutar:
 *   npm run db:seed:indices-fake                 → crea los que falten
 *   npm run db:seed:indices-fake -- --reemplazar → borra los fake existentes y los vuelve a crear
 */

import { prisma } from '../src/config/prisma.js';
import { GeoIndiceRepository } from '../src/modules/geo-indice/geo-indice.repository.js';
import { PARAMETROS, nivelSemaforo, redondear2, validarPesos } from '../src/modules/geo-indice/indice.algoritmo.js';

const VERSION_FAKE = 'fake-v1.0';
const repo = new GeoIndiceRepository();

// Pseudoaleatorio determinista en [0, 1) a partir de dos enteros
function azar(a, b) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Puntaje base según el nivel buscado; cada categoría varía ±20 alrededor de él
const BASE_POR_NIVEL = [86, 58, 28]; // verde, amarillo, rojo

function subpuntajeFake(propiedadId, categoriaId) {
  const base = BASE_POR_NIVEL[propiedadId % 3];
  const puntaje = redondear2(Math.min(100, Math.max(0, base + (azar(propiedadId, categoriaId) - 0.5) * 40)));
  const cantidad = Math.round(azar(categoriaId, propiedadId) * (puntaje / 10));
  return {
    puntaje,
    cantidad_puntos:    cantidad,
    distancia_minima_m: cantidad ? Math.round(PARAMETROS.distanciaMaximaM * (1 - puntaje / 100) + 50) : null,
  };
}

async function main() {
  const reemplazar = process.argv.includes('--reemplazar');
  if (reemplazar) {
    const { count } = await prisma.indiceConveniencia.deleteMany({ where: { version_algoritmo: VERSION_FAKE } });
    console.log(`🧹 ${count} índices fake anteriores eliminados`);
  }

  const categorias = await repo.categoriasActivas();
  const pesos = Object.fromEntries(categorias.map((c) => [c.nombre, Number(c.peso)]));
  validarPesos(pesos);

  const propiedades = await prisma.propiedad.findMany({
    where: {
      estado:   'publicado',
      latitud:  { not: null },
      longitud: { not: null },
      indices:  { none: { es_vigente: true } },
    },
    select:  { id: true, titulo: true },
    orderBy: { id: 'asc' },
  });

  const conteo = { verde: 0, amarillo: 0, rojo: 0 };
  for (const p of propiedades) {
    const subpuntajes = categorias.map((c) => ({ categoria_id: c.id, ...subpuntajeFake(p.id, c.id) }));
    const total = redondear2(subpuntajes.reduce((s, sub, i) => s + Number(categorias[i].peso) * sub.puntaje, 0));
    const nivel = nivelSemaforo(total);
    conteo[nivel]++;

    await repo.guardarCalculo(p.id, {
      puntos: [],
      indice: {
        puntaje_total:     total,
        nivel_semaforo:    nivel,
        radio_m:           PARAMETROS.distanciaMaximaM,
        version_algoritmo: VERSION_FAKE,
      },
      subpuntajes,
    });
  }

  console.log(`✅ ${propiedades.length} índices fake creados → 🟢 ${conteo.verde} · 🟡 ${conteo.amarillo} · 🔴 ${conteo.rojo}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
