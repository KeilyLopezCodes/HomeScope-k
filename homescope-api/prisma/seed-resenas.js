/**
 * seed-resenas.js — Datos de prueba de reseñas y calificaciones de vendedores
 *
 * Crea 11 reseñas con calificaciones variadas para dos vendedores:
 *   - catalogo@prueba.com → 8 reseñas (promedio 4.0) sobre las propiedades 1.ª a 6.ª publicadas
 *   - vendedor@prueba.com → 3 reseñas (promedio 4.3)
 * Reseñan los usuarios de prueba Carlos (comprador-sin), Laura (comprador-con) y Ana (vendedor@prueba.com,
 * que también compra). Las fechas se reparten en las últimas semanas.
 *
 * Respeta la regla de la API: solo reseña quien contactó la propiedad. Para cada reseña se asegura
 * que exista la conversación de ese comprador sobre esa propiedad con una pregunta suya y la respuesta
 * del vendedor; si la conversación ya tenía mensajes del comprador, no se toca.
 *
 * Es re-ejecutable: borra y vuelve a crear solo estas reseñas (mismo comprador y propiedad).
 *
 * Ejecutar:
 *   npm run db:seed:resenas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DIA = 24 * 60 * 60 * 1000;
const haceDias = (n, hora = 15) => new Date(Date.now() - n * DIA - (24 - hora) * 60 * 60 * 1000);

// [comprador, índice de la propiedad publicada del vendedor, calificación, comentario, hace cuántos días]
const RESENAS = {
  'catalogo@prueba.com': [
    ['comprador-sin@prueba.com', 0, 5, 'Respondió rápido todas mis preguntas y la casa estaba tal como en las fotos.', 30],
    ['comprador-con@prueba.com', 0, 4, 'Muy amable. La visita empezó un poco tarde, pero me explicó todo con detalle.', 26],
    ['comprador-sin@prueba.com', 1, 4, null, 22],
    ['vendedor@prueba.com',      1, 2, 'Tardó varios días en contestar y no tenía los papeles del apartamento a mano.', 19],
    ['comprador-sin@prueba.com', 2, 5, 'Excelente trato. Me mandó planos y fotos extra del terreno sin que se los pidiera.', 15],
    ['comprador-con@prueba.com', 3, 3, 'El local está bien ubicado, pero la descripción no mencionaba que necesita reparaciones.', 11],
    ['comprador-con@prueba.com', 4, 5, 'Muy profesional y puntual. Lo recomiendo.', 6],
    ['vendedor@prueba.com',      5, 4, 'Buena comunicación por el chat de HomeScope.', 2],
  ],
  'vendedor@prueba.com': [
    ['comprador-con@prueba.com', 0, 4, 'Atento y claro con el precio desde el principio.', 20],
    ['comprador-con@prueba.com', 2, 4, null, 12],
    ['comprador-sin@prueba.com', 5, 5, 'Me ayudó a coordinar la visita con muy poca anticipación. Muy recomendable.', 4],
  ],
};

const PREGUNTAS = [
  'Hola, ¿la propiedad sigue disponible?',
  'Buenas tardes, ¿el precio es negociable?',
  '¿Podría enviarme más fotos, por favor?',
  'Hola, ¿qué servicios incluye?',
];

async function usuario(email) {
  const u = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nombre: true, email: true } });
  if (!u) throw new Error(`Falta el usuario ${email}. Ejecuta antes npm run db:seed:prueba y npm run db:seed:catalogo`);
  return u;
}

// Conversación del comprador sobre la propiedad, con al menos una pregunta suya (lo que le da derecho a reseñar)
async function asegurarContacto(propiedadId, comprador, vendedor, dias, i) {
  const conversacion = await prisma.conversacion.upsert({
    where:  { propiedad_id_comprador_id: { propiedad_id: propiedadId, comprador_id: comprador.id } },
    update: {},
    create: { propiedad_id: propiedadId, comprador_id: comprador.id, vendedor_id: vendedor.id, fecha_inicio: haceDias(dias + 3) },
    select: { id: true, _count: { select: { mensajes: { where: { remitente_id: comprador.id } } } } },
  });
  if (conversacion._count.mensajes) return false; // ya hubo contacto real: no se agrega nada

  const pregunta  = haceDias(dias + 3, 10);
  const respuesta = haceDias(dias + 3, 12);
  await prisma.$transaction([
    prisma.mensaje.createMany({
      data: [
        { conversacion_id: conversacion.id, remitente_id: comprador.id, contenido: PREGUNTAS[i % PREGUNTAS.length], fecha_envio: pregunta, leido_en: respuesta },
        { conversacion_id: conversacion.id, remitente_id: vendedor.id, contenido: `Hola ${comprador.nombre}, sí, con gusto te comparto la información.`, fecha_envio: respuesta, leido_en: respuesta },
      ],
    }),
    prisma.conversacion.update({ where: { id: conversacion.id }, data: { ultimo_mensaje_en: respuesta } }),
  ]);
  return true;
}

async function main() {
  let contactosCreados = 0;

  for (const [emailVendedor, resenas] of Object.entries(RESENAS)) {
    const vendedor = await usuario(emailVendedor);
    const propiedades = await prisma.propiedad.findMany({
      where: { vendedor_id: vendedor.id, estado: 'publicado' }, orderBy: { id: 'asc' }, select: { id: true, titulo: true },
    });
    const necesarias = Math.max(...resenas.map(([, i]) => i)) + 1;
    if (propiedades.length < necesarias)
      throw new Error(`${emailVendedor} necesita al menos ${necesarias} propiedades publicadas`);

    console.log(`\n⭐ ${emailVendedor}`);
    for (const [i, [emailComprador, indice, calificacion, comentario, dias]] of resenas.entries()) {
      const comprador = await usuario(emailComprador);
      const propiedad = propiedades[indice];

      if (await asegurarContacto(propiedad.id, comprador, vendedor, dias, i)) contactosCreados++;

      // Re-ejecutable: la reseña de ese comprador sobre esa propiedad se reemplaza
      await prisma.resena.deleteMany({ where: { comprador_id: comprador.id, propiedad_id: propiedad.id } });
      await prisma.resena.create({
        data: {
          vendedor_id: vendedor.id, comprador_id: comprador.id, propiedad_id: propiedad.id,
          calificacion, comentario, fecha_creacion: haceDias(dias),
        },
      });
      console.log(`   ${'★'.repeat(calificacion)}${'☆'.repeat(5 - calificacion)}  ${comprador.nombre.padEnd(7)} → propiedad ${String(propiedad.id).padEnd(3)} ${propiedad.titulo}`);
    }

    const { _avg, _count } = await prisma.resena.aggregate({ where: { vendedor_id: vendedor.id }, _avg: { calificacion: true }, _count: true });
    console.log(`   Promedio: ${(Math.round(_avg.calificacion * 10) / 10).toFixed(1)} con ${_count} reseñas`);
  }

  console.log(`\n✅ Listo. Conversaciones con contacto creadas o completadas: ${contactosCreados} (las que ya tenían mensajes del comprador no se tocaron)`);
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
