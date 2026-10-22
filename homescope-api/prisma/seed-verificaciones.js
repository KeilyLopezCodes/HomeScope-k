/**
 * seed-verificaciones.js — Verificación de identidad de vendedores (datos de prueba)
 *
 *   - catalogo@prueba.com y vendedor@prueba.com: verificados (pueden publicar y muestran la insignia)
 *   - vendedor-pendiente@prueba.com: envió su documento y espera revisión → aprobar o rechazar en /admin
 *   - vendedor-sin-verificar@prueba.com: nunca envió documento → publicar responde VENDEDOR_NO_VERIFICADO
 * Los dos últimos se crean con la contraseña Password123 y tienen un borrador listo para publicar.
 * Los documentos son PDF de ejemplo guardados en el almacenamiento privado (UPLOADS_PRIVADOS_DIR).
 * Las aprobaciones las firma el primer administrador de la base.
 *
 * Es re-ejecutable: borra y vuelve a crear las verificaciones de estos cuatro vendedores.
 *
 * Ejecutar (después de db:seed:prueba y db:seed:catalogo):
 *   npm run db:seed:verificaciones
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { storage } from '../src/shared/adapters/storage/index.js';

const prisma = new PrismaClient();
const DIA = 24 * 60 * 60 * 1000;
const haceDias = (n) => new Date(Date.now() - n * DIA);

// PDF mínimo de una página con un texto (documento de ejemplo, no un documento real)
function pdfDeEjemplo(lineas) {
  const texto = lineas.map((l, i) => `BT /F1 ${i === 0 ? 18 : 12} Tf 60 ${720 - i * 28} Td (${l}) Tj ET`).join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objetos.map((obj, i) => { const o = pdf.length; pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; return o; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

async function documento(usuario, tipo) {
  const buffer = pdfDeEjemplo([
    'DOCUMENTO DE PRUEBA - HomeScope',
    `Tipo: ${tipo.toUpperCase()}`,
    `Titular: ${usuario.nombre} ${usuario.apellido}`,
    `Correo: ${usuario.email}`,
    'Generado por seed-verificaciones.js (no es un documento real)',
  ]);
  const { public_id } = await storage.subirPrivado(
    { buffer, mimetype: 'application/pdf', originalname: 'documento.pdf', size: buffer.length },
    `verificaciones/${usuario.id}`
  );
  return public_id;
}

async function vendedorDePrueba(email, nombre, apellido, rolVendedor, hash) {
  return prisma.usuario.upsert({
    where:  { email },
    update: {},
    create: {
      email, nombre, apellido, password_hash: hash, estado: 'activo', correo_verificado: true,
      usuario_rol: { create: { rol_id: rolVendedor.id } },
    },
    select: { id: true, email: true, nombre: true, apellido: true },
  });
}

// Un borrador completo, para probar "Publicar" con un vendedor sin verificar
async function borradorDe(usuario) {
  const titulo = `Casa de prueba de ${usuario.nombre}`;
  if (await prisma.propiedad.findFirst({ where: { vendedor_id: usuario.id, titulo } })) return;
  const tipo = await prisma.tipoPropiedad.findFirst({ where: { nombre: 'casa' } });
  await prisma.propiedad.create({
    data: {
      vendedor_id: usuario.id, tipo_propiedad_id: tipo.id, titulo, modalidad: 'venta', precio: 450000, moneda: 'GTQ',
      descripcion: 'Casa de prueba para verificar que un vendedor sin identidad verificada no puede publicar.',
      direccion: 'Calle de prueba 1, Jalapa', municipio: 'Jalapa', departamento: 'Jalapa', estado: 'borrador', paso_formulario: 4,
      habitaciones: 3, banos: 2, area_m2: 180,
    },
  });
}

async function main() {
  const admin = await prisma.usuario.findFirst({
    where:   { usuario_rol: { some: { rol: { nombre: { in: ['administrador', 'admin'] } } } } },
    orderBy: { id: 'asc' },
    select:  { id: true, email: true },
  });
  if (!admin) throw new Error('No hay ningún administrador para firmar las aprobaciones');
  const rolVendedor = await prisma.rol.findUnique({ where: { nombre: 'vendedor' } });
  const hash = await bcrypt.hash('Password123', 10);

  const verificados = await prisma.usuario.findMany({
    where:  { email: { in: ['catalogo@prueba.com', 'vendedor@prueba.com'] } },
    select: { id: true, email: true, nombre: true, apellido: true },
  });
  if (verificados.length < 2) throw new Error('Faltan catalogo@prueba.com o vendedor@prueba.com. Ejecuta antes db:seed:prueba y db:seed:catalogo');
  const pendiente = await vendedorDePrueba('vendedor-pendiente@prueba.com', 'Pedro', 'Pendiente', rolVendedor, hash);
  const sinVerificar = await vendedorDePrueba('vendedor-sin-verificar@prueba.com', 'Sara', 'SinVerificar', rolVendedor, hash);
  const todos = [...verificados, pendiente, sinVerificar];

  console.log('🧹 Borrando verificaciones anteriores de estos vendedores...');
  const anteriores = await prisma.verificacionVendedor.findMany({ where: { usuario_id: { in: todos.map((u) => u.id) } }, select: { documento_url: true } });
  await Promise.all(anteriores.map((v) => storage.eliminarPrivado(v.documento_url).catch(() => {})));
  await prisma.verificacionVendedor.deleteMany({ where: { usuario_id: { in: todos.map((u) => u.id) } } });

  console.log('🪪 Creando verificaciones...');
  for (const [i, u] of verificados.entries()) {
    await prisma.verificacionVendedor.create({
      data: {
        usuario_id: u.id, tipo_documento: 'dpi', documento_url: await documento(u, 'dpi'), estado: 'aprobada',
        revisado_por: admin.id, fecha_solicitud: haceDias(20 + i), fecha_revision: haceDias(19 + i),
      },
    });
  }
  await prisma.verificacionVendedor.create({
    data: { usuario_id: pendiente.id, tipo_documento: 'pasaporte', documento_url: await documento(pendiente, 'pasaporte'), fecha_solicitud: haceDias(1) },
  });
  await borradorDe(pendiente);
  await borradorDe(sinVerificar);

  console.log(`
✅ Listo (aprobaciones firmadas por ${admin.email}).
   Verificados (pueden publicar, insignia): ${verificados.map((u) => u.email).join(', ')}
   Pendiente de revisión en /admin/verificaciones: ${pendiente.email} (id ${pendiente.id})
   Sin verificar (publicar → VENDEDOR_NO_VERIFICADO): ${sinVerificar.email} (id ${sinVerificar.id})
   Contraseña de los dos nuevos: Password123 — cada uno tiene un borrador "Casa de prueba de …" para intentar publicarlo.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
