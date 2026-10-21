/**
 * seed-moderacion.js — Datos de prueba para los endpoints de moderación (/reportes y /admin/...)
 *
 * Deja la base lista para probar cada caso:
 *   - Publicaciones con reportes abiertos: "Casa familiar #1" (3), "Casa con jardín #6" (2),
 *     "Local sobre calle principal #4" (1, en revisión) y "Casa en Zona 10" de vendedor@prueba.com (1)
 *     → GET /admin/propiedades, y pausar / aprobar / eliminar
 *   - "Terreno con vista #8" ya pausada por moderación → aprobar la vuelve a publicar; su dueño no puede reactivarla
 *   - Usuarios reportados: interesado05 (2 reportes) e interesado06 (1) → GET /admin/usuarios?reportados=true, suspender
 *   - interesado07 ya suspendido → reactivar; iniciar sesión con él responde CUENTA_SUSPENDIDA
 *   - Comentarios de zona reportados (uno creado aquí por interesado08) → PUT /admin/reportes/:id con ocultar_comentario
 *   - Historial en accion_moderacion: la pausa, la suspensión y una aprobación anterior ("Oficina en edificio corporativo #10")
 *
 * Reportan los compradores de prueba interesado10…25 (los crea seed-estadisticas, contraseña Password123).
 * Las acciones del historial las firma el primer administrador de la base.
 *
 * Es re-ejecutable: antes de crear, deshace lo que dejó una ejecución anterior (vuelve a publicar la
 * publicación que pausó, reactiva la cuenta que suspendió) y borra sus reportes, comentarios y acciones.
 * No toca reportes ni acciones hechos a mano desde la API.
 *
 * Ejecutar (después de db:seed:prueba, db:seed:catalogo y db:seed:estadisticas):
 *   npm run db:seed:moderacion
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MARCA = 'moderacion'; // detalle.seed de las acciones que crea este seed
const DIA = 24 * 60 * 60 * 1000;
const haceDias = (n, hora = 15) => new Date(Date.now() - n * DIA - (24 - hora) * 60 * 60 * 1000);

const email = (n) => `interesado${String(n).padStart(2, '0')}@prueba.com`;
const REPORTANTES = Array.from({ length: 16 }, (_, i) => email(i + 10)); // interesado10…25

async function usuarioPorEmail(correo) {
  const u = await prisma.usuario.findUnique({ where: { email: correo }, select: { id: true, nombre: true, estado: true } });
  if (!u) throw new Error(`Falta ${correo}. Ejecuta antes npm run db:seed:estadisticas (y db:seed:prueba / db:seed:catalogo)`);
  return u;
}

async function propiedadPorTitulo(titulo) {
  const p = await prisma.propiedad.findFirst({ where: { titulo }, select: { id: true, titulo: true, estado: true, vendedor_id: true } });
  if (!p) throw new Error(`Falta la publicación "${titulo}". Ejecuta antes npm run db:seed:catalogo`);
  return p;
}

// ── Deshacer una ejecución anterior ────────────────────────────────────────────
async function limpiar(idsReportantes, autorComentario) {
  const anteriores = await prisma.accionModeracion.findMany({
    where:  { detalle: { path: ['seed'], equals: MARCA } },
    select: { id: true, accion: true, propiedad_id: true, usuario_id: true },
  });
  for (const a of anteriores) {
    if (a.accion === 'pausar' && a.propiedad_id)
      await prisma.propiedad.updateMany({ where: { id: a.propiedad_id, estado: 'pausado' }, data: { estado: 'publicado' } });
    if (a.accion === 'suspender' && a.usuario_id)
      await prisma.usuario.updateMany({ where: { id: a.usuario_id, estado: 'suspendido' }, data: { estado: 'activo' } });
  }
  const acciones = await prisma.accionModeracion.deleteMany({ where: { id: { in: anteriores.map((a) => a.id) } } });
  const reportes = await prisma.reporte.deleteMany({ where: { reportante_id: { in: idsReportantes } } });
  const comentarios = await prisma.comentarioZona.deleteMany({ where: { usuario_id: autorComentario } });
  console.log(`🧹 Ejecución anterior deshecha: ${acciones.count} acciones, ${reportes.count} reportes, ${comentarios.count} comentarios`);
}

async function main() {
  const admin = await prisma.usuario.findFirst({
    where:   { usuario_rol: { some: { rol: { nombre: { in: ['administrador', 'admin'] } } } } },
    orderBy: { id: 'asc' },
    select:  { id: true, email: true },
  });
  if (!admin) throw new Error('No hay ningún usuario con rol administrador para firmar las acciones del historial');

  const reportantes = await Promise.all(REPORTANTES.map(usuarioPorEmail));
  const [r10, r11, r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22] = reportantes;
  const interesado05 = await usuarioPorEmail(email(5));
  const interesado06 = await usuarioPorEmail(email(6));
  const interesado07 = await usuarioPorEmail(email(7));
  const interesado08 = await usuarioPorEmail(email(8));

  await limpiar(reportantes.map((u) => u.id), interesado08.id);

  const casa1     = await propiedadPorTitulo('Casa familiar #1');
  const balcon2   = await propiedadPorTitulo('Apartamento con balcón #2');
  const local4    = await propiedadPorTitulo('Local sobre calle principal #4');
  const jardin6   = await propiedadPorTitulo('Casa con jardín #6');
  const terreno8  = await propiedadPorTitulo('Terreno con vista #8');
  const oficina10 = await propiedadPorTitulo('Oficina en edificio corporativo #10');
  const zona10    = await propiedadPorTitulo('Casa en Zona 10'); // de vendedor@prueba.com
  for (const p of [casa1, local4, jardin6, terreno8, oficina10, zona10])
    if (p.estado !== 'publicado')
      console.warn(`⚠️  "${p.titulo}" está ${p.estado}: sus reportes se crean igual, pero pausarla responderá ESTADO_INVALIDO`);

  const reporte = (reportante, objetivo, motivo, descripcion, dias, estado = 'pendiente') =>
    prisma.reporte.create({
      data: { reportante_id: reportante.id, motivo, descripcion, estado, fecha_creacion: haceDias(dias), ...objetivo },
      select: { id: true },
    });
  const pub = (p) => ({ tipo_objetivo: 'propiedad', propiedad_id: p.id });
  const usr = (u) => ({ tipo_objetivo: 'usuario', usuario_reportado_id: u.id });
  const com = (c) => ({ tipo_objetivo: 'comentario', comentario_zona_id: c.id });

  console.log('🚩 Reportes abiertos sobre publicaciones...');
  await reporte(r10, pub(casa1), 'informacion_falsa', 'Las fotos no coinciden con la dirección: la casa real no tiene jardín.', 6);
  await reporte(r11, pub(casa1), 'informacion_falsa', 'El precio publicado es la mitad de lo que piden por teléfono.', 4);
  await reporte(r12, pub(casa1), 'fraude', 'Me pidieron un depósito para "apartar" la visita.', 1);
  await reporte(r13, pub(jardin6), 'spam', 'Está publicada tres veces con distinto título.', 3);
  await reporte(r14, pub(jardin6), 'otro', 'La descripción incluye un enlace a otra página de ventas.', 2);
  await reporte(r15, pub(local4), 'informacion_falsa', 'El local ya está alquilado, lo confirmé con el vecino.', 5, 'en_revision');
  await reporte(r16, pub(zona10), 'fraude', 'El número de contacto pertenece a otra persona.', 2);

  console.log('🚩 Reportes abiertos sobre usuarios...');
  await reporte(r17, usr(interesado05), 'fraude', 'Se hizo pasar por agente de bienes raíces y pidió una comisión.', 4);
  await reporte(r18, usr(interesado05), 'spam', 'Envía el mismo mensaje promocional a todos los vendedores.', 2);
  await reporte(r19, usr(interesado06), 'ofensivo', 'Respondió con insultos cuando le dije que el precio no era negociable.', 1);

  console.log('🚩 Comentarios de zona reportados...');
  const comentario = await prisma.comentarioZona.create({
    data: {
      propiedad_id: balcon2.id, usuario_id: interesado08.id, fecha_creacion: haceDias(3),
      comentario: 'Zona horrible, los vecinos son unos ladrones. No compren aquí, el dueño es un estafador.',
    },
    select: { id: true },
  });
  await reporte(r20, com(comentario), 'ofensivo', 'Acusa a los vecinos sin pruebas.', 2);
  await reporte(r21, com(comentario), 'ofensivo', null, 1);
  const otroComentario = await prisma.comentarioZona.findFirst({
    where: { estado: 'visible', id: { not: comentario.id }, usuario_id: { not: r22.id } }, select: { id: true },
  });
  if (otroComentario) await reporte(r22, com(otroComentario), 'datos_personales', 'Menciona el nombre completo de un vecino.', 1);

  console.log('📋 Historial de acciones...');
  // "Terreno con vista #8" pausada por moderación (sus reportes quedaron resueltos)
  const rTerreno = await reporte(r10, pub(terreno8), 'informacion_falsa', 'El terreno no tiene acceso por calle como dice el anuncio.', 9, 'resuelto');
  await reporte(r11, pub(terreno8), 'informacion_falsa', 'Las medidas no coinciden con el registro.', 8, 'resuelto');
  await prisma.propiedad.updateMany({ where: { id: terreno8.id, estado: 'publicado' }, data: { estado: 'pausado' } });
  await prisma.accionModeracion.create({
    data: {
      administrador_id: admin.id, accion: 'pausar', propiedad_id: terreno8.id, usuario_id: terreno8.vendedor_id,
      reporte_id: rTerreno.id, motivo: 'Dos reportes coinciden en que la información del terreno es falsa. Pausada hasta que el vendedor la corrija.',
      detalle: { seed: MARCA, estado_anterior: 'publicado', reportes_cerrados: 2 }, fecha_accion: haceDias(7),
    },
  });

  // interesado07 suspendido (su reporte quedó resuelto)
  const rSuspension = await reporte(r12, usr(interesado07), 'fraude', 'Ofreció pagar con cheques sin fondos a varios vendedores.', 6, 'resuelto');
  await prisma.usuario.update({ where: { id: interesado07.id }, data: { estado: 'suspendido' } });
  await prisma.tokenUsuario.updateMany({ where: { usuario_id: interesado07.id, tipo: 'refresh', usado: false }, data: { usado: true, usado_en: new Date() } });
  await prisma.accionModeracion.create({
    data: {
      administrador_id: admin.id, accion: 'suspender', usuario_id: interesado07.id, reporte_id: rSuspension.id,
      motivo: 'Intento de fraude confirmado con dos vendedores.',
      detalle: { seed: MARCA, estado_anterior: interesado07.estado === 'suspendido' ? 'activo' : interesado07.estado, propiedades_pausadas: [], reportes_cerrados: 1 },
      fecha_accion: haceDias(5),
    },
  });

  // Una aprobación anterior: el reporte no procedía
  const rAprobado = await reporte(r13, pub(oficina10), 'spam', 'Creo que es un anuncio repetido.', 12, 'descartado');
  await prisma.accionModeracion.create({
    data: {
      administrador_id: admin.id, accion: 'aprobar', propiedad_id: oficina10.id, usuario_id: oficina10.vendedor_id,
      reporte_id: rAprobado.id, motivo: 'Revisado: es la única publicación de esa oficina, no es spam.',
      detalle: { seed: MARCA, reportes_descartados: 1, republicada: false }, fecha_accion: haceDias(10),
    },
  });

  const abiertos = await prisma.reporte.count({ where: { estado: { in: ['pendiente', 'en_revision'] } } });
  console.log(`
✅ Listo. Reportes abiertos en total: ${abiertos}. Acciones firmadas por ${admin.email}.

   Para probar (con el token del administrador en Swagger):
   GET  /admin/propiedades                      → ${casa1.titulo} (id ${casa1.id}) con 3 reportes, ${jardin6.titulo} (id ${jardin6.id}), ...
   GET  /admin/usuarios?reportados=true         → interesado05 (id ${interesado05.id}) con 2 reportes, interesado06 (id ${interesado06.id})
   GET  /admin/usuarios?estado=suspendido       → interesado07 (id ${interesado07.id})
   GET  /admin/reportes?tipo=comentario         → el comentario ${comentario.id} con 2 reportes
   GET  /admin/acciones                         → pausar, suspender y aprobar del historial
   POST /admin/acciones  { "accion": "pausar",    "propiedad_id": ${casa1.id}, "motivo": "..." }
   POST /admin/acciones  { "accion": "aprobar",   "propiedad_id": ${terreno8.id}, "motivo": "..." }   ← la vuelve a publicar
   POST /admin/acciones  { "accion": "suspender", "usuario_id": ${interesado05.id}, "motivo": "..." }
   POST /admin/acciones  { "accion": "reactivar", "usuario_id": ${interesado07.id}, "motivo": "..." }`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
