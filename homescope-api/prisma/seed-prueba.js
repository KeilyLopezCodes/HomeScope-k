/**
 * seed-prueba.js — Datos de prueba para validar criterios de aceptación
 *
 * Crea:
 *   - 3 usuarios: vendedor, comprador_SIN_conv, comprador_CON_conv
 *   - 1 tipo de propiedad
 *   - 2 propiedades publicadas del vendedor
 *   - 1 propiedad en borrador del vendedor
 *   - Vistas de ambos compradores
 *   - Favoritos del comprador_CON_conv
 *   - 1 conversación entre vendedor y comprador_CON_conv (propiedad 1)
 *     → comprador_CON_conv DEBE ver email/teléfono en GET /propiedades/1
 *     → comprador_SIN_conv NO debe verlos
 *
 * Ejecutar:
 *   node prisma/seed-prueba.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const HASH = await bcrypt.hash('Password123', 10);

async function main() {
  console.log('🌱 Limpiando datos de prueba anteriores...');

  // Limpiar en orden por FK
  await prisma.conversacion.deleteMany();
  await prisma.favorito.deleteMany();
  await prisma.vistaPropiedad.deleteMany();
  await prisma.propiedad.deleteMany();
  await prisma.usuarioRol.deleteMany();
  await prisma.tokenUsuario.deleteMany();
  await prisma.usuario.deleteMany({ where: { email: { in: [
    'vendedor@prueba.com',
    'comprador-sin@prueba.com',
    'comprador-con@prueba.com',
  ]}}});

  console.log('👤 Creando roles...');
  const rolVendedor   = await prisma.rol.upsert({ where: { nombre: 'vendedor' },   update: {}, create: { nombre: 'vendedor' } });
  const rolComprador  = await prisma.rol.upsert({ where: { nombre: 'comprador' },  update: {}, create: { nombre: 'comprador' } });

  console.log('👤 Creando usuarios...');

  const vendedor = await prisma.usuario.create({
    data: {
      nombre:            'Ana',
      apellido:          'Vendedora',
      email:             'vendedor@prueba.com',
      password_hash:     HASH,
      telefono:          '55551111',
      estado:            'activo',
      correo_verificado: true,
      usuario_rol:       { create: { rol_id: rolVendedor.id } },
    },
  });

  const compradorSin = await prisma.usuario.create({
    data: {
      nombre:            'Carlos',
      apellido:          'SinConversacion',
      email:             'comprador-sin@prueba.com',
      password_hash:     HASH,
      estado:            'activo',
      correo_verificado: true,
      usuario_rol:       { create: { rol_id: rolComprador.id } },
    },
  });

  const compradorCon = await prisma.usuario.create({
    data: {
      nombre:            'Laura',
      apellido:          'ConConversacion',
      email:             'comprador-con@prueba.com',
      password_hash:     HASH,
      estado:            'activo',
      correo_verificado: true,
      usuario_rol:       { create: { rol_id: rolComprador.id } },
    },
  });

  console.log('🏠 Creando tipo de propiedad...');
  const tipo = await prisma.tipoPropiedad.upsert({
    where:  { nombre: 'casa' },
    update: {},
    create: { nombre: 'casa' },
  });

  console.log('🏠 Creando propiedades...');

  // Propiedad 1 — publicada (tiene conversación con compradorCon)
  const prop1 = await prisma.propiedad.create({
    data: {
      vendedor_id:       vendedor.id,
      tipo_propiedad_id: tipo.id,
      titulo:            'Casa en Zona 10',
      descripcion:       'Hermosa casa con jardín.',
      modalidad:         'venta',
      precio:            850000,
      moneda:            'GTQ',
      habitaciones:      3,
      banos:             2,
      area_m2:           180,
      direccion:         '5a Avenida 10-50, Zona 10',
      municipio:         'Guatemala',
      departamento:      'Guatemala',
      estado:            'publicado',
      fecha_publicacion: new Date(),
    },
  });

  // Propiedad 2 — publicada (sin conversaciones)
  const prop2 = await prisma.propiedad.create({
    data: {
      vendedor_id:       vendedor.id,
      tipo_propiedad_id: tipo.id,
      titulo:            'Apartamento en Zona 4',
      descripcion:       'Moderno apartamento céntrico.',
      modalidad:         'alquiler',
      precio:            4500,
      moneda:            'GTQ',
      habitaciones:      2,
      banos:             1,
      area_m2:           85,
      direccion:         '12 Calle 4-20, Zona 4',
      municipio:         'Guatemala',
      departamento:      'Guatemala',
      estado:            'publicado',
      fecha_publicacion: new Date(),
    },
  });

  // Propiedad 3 — borrador (NO debe aparecer en catálogo público)
  await prisma.propiedad.create({
    data: {
      vendedor_id:       vendedor.id,
      tipo_propiedad_id: tipo.id,
      titulo:            'Terreno en Borrador',
      modalidad:         'venta',
      precio:            200000,
      moneda:            'GTQ',
      direccion:         'Sin dirección aún',
      estado:            'borrador',
    },
  });

  console.log('👁️  Registrando vistas...');

  await prisma.vistaPropiedad.createMany({
    data: [
      { propiedad_id: prop1.id, usuario_id: compradorSin.id, origen: 'catalogo' },
      { propiedad_id: prop2.id, usuario_id: compradorSin.id, origen: 'busqueda' },
      { propiedad_id: prop1.id, usuario_id: compradorCon.id, origen: 'mapa'     },
    ],
  });

  console.log('❤️  Registrando favoritos...');

  await prisma.favorito.createMany({
    data: [
      { usuario_id: compradorCon.id, propiedad_id: prop1.id },
      { usuario_id: compradorCon.id, propiedad_id: prop2.id },
    ],
  });

  console.log('💬 Creando conversación (compradorCon ↔ vendedor, propiedad 1)...');

  await prisma.conversacion.create({
    data: {
      propiedad_id: prop1.id,
      comprador_id: compradorCon.id,
      vendedor_id:  vendedor.id,
    },
  });

  console.log('\n✅ Seed completado. Credenciales de prueba:\n');
  console.log('  Rol        | Email                      | Password');
  console.log('  -----------|----------------------------|-------------');
  console.log('  vendedor   | vendedor@prueba.com        | Password123');
  console.log('  comprador  | comprador-sin@prueba.com   | Password123  ← SIN conversación');
  console.log('  comprador  | comprador-con@prueba.com   | Password123  ← CON conversación');
  console.log(`\n  Propiedad con conversación: ID ${prop1.id} (${prop1.titulo})`);
  console.log(`  Propiedad sin conversación: ID ${prop2.id} (${prop2.titulo})\n`);
  console.log('📋 Criterios a validar:');
  console.log('  1. GET /propiedades/mias        → login como vendedor@prueba.com → debe ver 3 propiedades');
  console.log('  2. GET /propiedades/vistas       → login como comprador-sin@prueba.com → debe ver 2 propiedades');
  console.log('  3. GET /favoritos                → login como comprador-con@prueba.com → debe ver 2 favoritos');
  console.log(`  4. GET /propiedades/${prop1.id} sin token          → vendedor sin email/teléfono`);
  console.log(`  5. GET /propiedades/${prop1.id} como comprador-sin → vendedor sin email/teléfono`);
  console.log(`  6. GET /propiedades/${prop1.id} como comprador-con → vendedor CON email y teléfono ✓`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
