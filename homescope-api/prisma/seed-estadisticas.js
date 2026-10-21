/**
 * seed-estadisticas.js — Actividad de prueba para el panel del vendedor
 *
 * Para las propiedades publicadas y pausadas de catalogo@prueba.com genera, en los últimos 90 días:
 *   - vistas diarias con tendencia, más visitas el fin de semana y popularidad distinta por propiedad
 *   - favoritos y conversaciones con preguntas de interesados (algunas sin leer)
 * Crea 25 compradores de prueba (interesado01…25@prueba.com, contraseña Password123) que generan esa actividad.
 *
 * Para que haya casos de bajo desempeño, algunas propiedades casi no reciben vistas y una recibe muchas
 * pero nadie la guarda ni escribe. También escalona la fecha de publicación (entre 10 y 97 días atrás,
 * conservando el orden del catálogo) para que las propiedades se puedan evaluar.
 *
 * Es re-ejecutable y determinista: borra y vuelve a crear solo la actividad de los 25 interesados.
 *
 * Ejecutar (después de db:seed:prueba y db:seed:catalogo):
 *   npm run db:seed:estadisticas
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const EMAIL_VENDEDOR = 'catalogo@prueba.com';
const DIAS = 90;
const TOTAL_INTERESADOS = 25;
const DIA = 24 * 60 * 60 * 1000;
const ORIGENES = ['catalogo', 'catalogo', 'busqueda', 'mapa'];

// Generador pseudoaleatorio con semilla (mulberry32): cada ejecución produce los mismos datos
function generador(semilla) {
  let a = semilla;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = generador(20261020);
const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

// Fecha `diasAtras` días antes de hoy, a una hora entre las 7:00 y las 22:00 (hora de Guatemala).
// Si hoy esa hora todavía no llega devuelve null (esa vista o favorito no se crea)
function momento(diasAtras) {
  const d = new Date(Date.now() - diasAtras * DIA);
  d.setUTCHours(13 + entero(0, 15), entero(0, 59), entero(0, 59), 0); // 13–04 UTC = 7–22 h en UTC−6
  return d.getTime() > Date.now() ? null : d;
}

// Popularidad (vistas promedio al día) por posición en el catálogo: la mayoría normal,
// algunas casi sin vistas y una con muchas vistas pero sin interés
const BAJAS = new Set([3, 8, 14, 21]);
const SIN_INTERES = 9; // fuera de las 6 primeras, que tienen conversaciones de seed-resenas
function perfil(i) {
  if (BAJAS.has(i))       return { vistasDia: 0.08, interes: 0.5 };
  if (i === SIN_INTERES)  return { vistasDia: 2.5,  interes: 0 };
  return { vistasDia: 1.2 + (i % 5) * 0.35, interes: 1 };
}

// Más vistas el fin de semana y una tendencia creciente en las últimas semanas
function vistasDelDia(base, diasAtras) {
  const fecha = new Date(Date.now() - diasAtras * DIA);
  const finDeSemana = [0, 6].includes(fecha.getUTCDay()) ? 1.5 : 1;
  const tendencia = 0.6 + 0.8 * (1 - diasAtras / DIAS);
  const esperado = base * finDeSemana * tendencia;
  // Redondeo aleatorio: conserva el promedio aunque sea menor que 1
  return Math.floor(esperado) + (azar() < esperado % 1 ? 1 : 0) + (azar() < 0.15 ? entero(0, 2) : 0) * (base > 0.5 ? 1 : 0);
}

const PREGUNTAS = [
  'Hola, ¿la propiedad sigue disponible?',
  'Buenas tardes, ¿el precio es negociable?',
  '¿Podría enviarme más fotos de la cocina?',
  '¿Cuánto es el mantenimiento mensual?',
  '¿Se puede visitar este fin de semana?',
  '¿Acepta financiamiento bancario?',
];
const SEGUIMIENTO = ['Perfecto, gracias.', '¿Y tiene parqueo para visitas?', 'Me interesa, ¿cuándo podría verla?'];

async function main() {
  const vendedor = await prisma.usuario.findUnique({ where: { email: EMAIL_VENDEDOR }, select: { id: true, nombre: true } });
  if (!vendedor) throw new Error(`Falta ${EMAIL_VENDEDOR}. Ejecuta antes npm run db:seed:prueba y npm run db:seed:catalogo`);

  console.log('👥 Asegurando compradores de prueba...');
  const rolComprador = await prisma.rol.upsert({ where: { nombre: 'comprador' }, update: {}, create: { nombre: 'comprador' } });
  const hash = await bcrypt.hash('Password123', 10);
  const interesados = [];
  for (let n = 1; n <= TOTAL_INTERESADOS; n++) {
    const email = `interesado${String(n).padStart(2, '0')}@prueba.com`;
    interesados.push(await prisma.usuario.upsert({
      where:  { email },
      update: {},
      create: {
        email, nombre: `Interesado ${n}`, apellido: 'Prueba', password_hash: hash,
        estado: 'activo', correo_verificado: true,
        usuario_rol: { create: { rol_id: rolComprador.id } },
      },
      select: { id: true, nombre: true },
    }));
  }
  const idsInteresados = interesados.map((u) => u.id);

  console.log('🧹 Borrando la actividad anterior de los interesados...');
  await prisma.$transaction([
    prisma.vistaPropiedad.deleteMany({ where: { usuario_id: { in: idsInteresados } } }),
    prisma.favorito.deleteMany({ where: { usuario_id: { in: idsInteresados } } }),
    prisma.conversacion.deleteMany({ where: { comprador_id: { in: idsInteresados } } }), // mensajes en cascada
  ]);

  // Mismo orden que el catálogo (la #1 es la más reciente)
  const propiedades = await prisma.propiedad.findMany({
    where:   { vendedor_id: vendedor.id, estado: { in: ['publicado', 'pausado'] } },
    orderBy: [{ fecha_publicacion: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    select:  { id: true, titulo: true, estado: true },
  });

  console.log(`📈 Generando actividad de ${DIAS} días para ${propiedades.length} propiedades...`);
  const vistas = [];
  const favoritos = [];
  let conversaciones = 0;
  let mensajes = 0;

  for (const [i, propiedad] of propiedades.entries()) {
    // Publicada entre 10 y 97 días atrás (las pausadas, al final de la lista, también tuvieron actividad)
    const diasPublicada = Math.min(10 + i * 3, DIAS + 7);
    await prisma.propiedad.update({
      where: { id: propiedad.id },
      data:  { fecha_publicacion: new Date(Date.now() - diasPublicada * DIA) },
    });

    const { vistasDia, interes } = perfil(i);
    // Una pausada no recibe vistas desde que se pausó (hace 5 días)
    const ultimoDia = propiedad.estado === 'pausado' ? 5 : 0;
    for (let d = Math.min(diasPublicada, DIAS - 1); d >= ultimoDia; d--) {
      for (let k = vistasDelDia(vistasDia, d); k > 0; k--) {
        const fecha = momento(d);
        if (fecha) vistas.push({ propiedad_id: propiedad.id, usuario_id: elegir(idsInteresados), origen: elegir(ORIGENES), fecha_vista: fecha });
      }
    }

    // Cada interesado puede guardarla o escribir, más probable cuanto más popular es
    for (const comprador of interesados) {
      const prob = Math.min(0.06 * vistasDia, 0.3) * interes;
      const fechaFavorito = momento(entero(ultimoDia, Math.min(diasPublicada, DIAS - 1)));
      if (azar() < prob && fechaFavorito)
        favoritos.push({ usuario_id: comprador.id, propiedad_id: propiedad.id, fecha_agregado: fechaFavorito });

      if (azar() < prob * 0.8) {
        const dia = entero(Math.max(ultimoDia, 1), Math.min(diasPublicada, DIAS - 1));
        const inicio = momento(dia);
        const recientes = dia <= 2; // las preguntas de los últimos días quedan sin leer
        const conversacion = await prisma.conversacion.create({
          data: { propiedad_id: propiedad.id, comprador_id: comprador.id, vendedor_id: vendedor.id, fecha_inicio: inicio },
        });
        const filas = [{ remitente_id: comprador.id, contenido: elegir(PREGUNTAS), fecha_envio: inicio, leido_en: recientes ? null : new Date(inicio.getTime() + 2 * 3600e3) }];
        if (!recientes) {
          const respuesta = new Date(inicio.getTime() + 3 * 3600e3);
          filas.push({ remitente_id: vendedor.id, contenido: `Hola ${comprador.nombre}, con gusto te ayudo.`, fecha_envio: respuesta, leido_en: respuesta });
          if (azar() < 0.5) {
            const otra = new Date(inicio.getTime() + 5 * 3600e3);
            filas.push({ remitente_id: comprador.id, contenido: elegir(SEGUIMIENTO), fecha_envio: otra, leido_en: new Date(otra.getTime() + 3600e3) });
          }
        }
        await prisma.mensaje.createMany({ data: filas.map((f) => ({ ...f, conversacion_id: conversacion.id })) });
        await prisma.conversacion.update({ where: { id: conversacion.id }, data: { ultimo_mensaje_en: filas.at(-1).fecha_envio } });
        conversaciones++;
        mensajes += filas.length;
      }
    }
  }

  await prisma.vistaPropiedad.createMany({ data: vistas });
  await prisma.favorito.createMany({ data: favoritos });

  console.log(`\n✅ Listo: ${vistas.length} vistas, ${favoritos.length} favoritos, ${conversaciones} conversaciones (${mensajes} mensajes).`);
  console.log(`   Bajo desempeño a propósito: ${[...BAJAS].map((i) => propiedades[i]?.titulo).filter(Boolean).join(', ')}`);
  console.log(`   Muchas vistas sin interés: ${propiedades[SIN_INTERES]?.titulo}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
