/**
 * seed-catalogo.js — Datos para validar la paginación del catálogo (GET /propiedades)
 *
 * Crea, a nombre de un vendedor propio (catalogo@prueba.com / Password123):
 *   - 30 propiedades PUBLICADAS → con pageSize 12 son 3 páginas (12 + 12 + 6), más las que ya existan
 *   - 3 en BORRADOR y 2 PAUSADAS → NO deben aparecer en el catálogo ni contar en `total`
 *   - Fotos de portada externas (picsum.photos) en 2 de cada 3 publicadas; el resto sin foto
 *
 * Es re-ejecutable y NO toca otros datos: solo borra las propiedades de ese vendedor.
 *
 * Ejecutar:
 *   npm run db:seed:catalogo
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMAIL_VENDEDOR = 'catalogo@prueba.com';
const TOTAL_PUBLICADAS = 30;

const UBICACIONES = [
  { zona: 'Zona 1',  municipio: 'Jalapa',          departamento: 'Jalapa' },
  { zona: 'Zona 2',  municipio: 'Jalapa',          departamento: 'Jalapa' },
  { zona: null,      municipio: 'Monjas',          departamento: 'Jalapa' },
  { zona: null,      municipio: 'San Pedro Pinula', departamento: 'Jalapa' },
  { zona: 'Zona 10', municipio: 'Guatemala',       departamento: 'Guatemala' },
  { zona: 'Zona 15', municipio: 'Guatemala',       departamento: 'Guatemala' },
  { zona: null,      municipio: 'Mixco',           departamento: 'Guatemala' },
  { zona: null,      municipio: 'Antigua Guatemala', departamento: 'Sacatepéquez' },
  { zona: null,      municipio: 'Jutiapa',         departamento: 'Jutiapa' },
  { zona: null,      municipio: 'Chiquimula',      departamento: 'Chiquimula' },
];

const TIPOS = ['casa', 'apartamento', 'terreno', 'local', 'oficina'];

const TITULOS = {
  casa:        ['Casa familiar', 'Casa con jardín', 'Casa amplia de dos niveles', 'Casa en residencial'],
  apartamento: ['Apartamento céntrico', 'Apartamento con balcón', 'Apartamento amueblado'],
  terreno:     ['Terreno plano', 'Terreno con vista', 'Lote para construir'],
  local:       ['Local comercial', 'Local sobre calle principal'],
  oficina:     ['Oficina ejecutiva', 'Oficina en edificio corporativo'],
};

function propiedadDePrueba(i, vendedorId, tiposPorNombre, estado) {
  const tipo      = TIPOS[i % TIPOS.length];
  const ubicacion = UBICACIONES[i % UBICACIONES.length];
  const modalidad = i % 3 === 0 ? 'alquiler' : 'venta';
  const moneda    = i % 4 === 0 ? 'USD' : 'GTQ';
  const titulos   = TITULOS[tipo];
  const base      = modalidad === 'alquiler' ? 2500 + i * 150 : 250000 + i * 17500;
  const conCuartos = tipo === 'casa' || tipo === 'apartamento';

  return {
    vendedor_id:       vendedorId,
    tipo_propiedad_id: tiposPorNombre[tipo],
    titulo:            `${titulos[i % titulos.length]} #${i + 1}`,
    descripcion:       `Propiedad de prueba número ${i + 1} generada para validar la paginación del catálogo.`,
    modalidad,
    precio:            moneda === 'USD' ? Math.round(base / 7.8) : base,
    moneda,
    habitaciones:      conCuartos ? 1 + (i % 4) : null,
    banos:             conCuartos ? 1 + (i % 3) * 0.5 : null,
    area_m2:           tipo === 'terreno' ? 300 + i * 20 : 60 + i * 5,
    parqueos:          tipo === 'terreno' ? null : i % 3,
    direccion:         `Calle de prueba ${i + 1}, ${ubicacion.municipio}`,
    ...ubicacion,
    estado,
    paso_formulario:   4,
    // Fechas escalonadas: la #1 es la más reciente, así el orden del catálogo es predecible
    ...(estado === 'publicado' && { fecha_publicacion: new Date(Date.now() - i * 60 * 60 * 1000) }),
  };
}

async function main() {
  const tipos = await prisma.tipoPropiedad.findMany();
  const tiposPorNombre = Object.fromEntries(tipos.map((t) => [t.nombre, t.id]));
  const faltantes = TIPOS.filter((t) => !tiposPorNombre[t]);
  if (faltantes.length) throw new Error(`Faltan tipos de propiedad en la BD: ${faltantes.join(', ')}`);

  const rolVendedor = await prisma.rol.upsert({
    where: { nombre: 'vendedor' }, update: {}, create: { nombre: 'vendedor' },
  });

  const vendedor = await prisma.usuario.upsert({
    where:  { email: EMAIL_VENDEDOR },
    update: {},
    create: {
      nombre:            'Catálogo',
      apellido:          'Prueba',
      email:             EMAIL_VENDEDOR,
      password_hash:     await bcrypt.hash('Password123', 10),
      estado:            'activo',
      correo_verificado: true,
      usuario_rol:       { create: { rol_id: rolVendedor.id } },
    },
  });

  // Solo se limpian las propiedades de este vendedor (las fotos caen por cascada)
  const { count: borradas } = await prisma.propiedad.deleteMany({ where: { vendedor_id: vendedor.id } });
  if (borradas) console.log(`🧹 ${borradas} propiedades anteriores del vendedor de catálogo eliminadas`);

  console.log(`🏠 Creando ${TOTAL_PUBLICADAS} propiedades publicadas...`);
  for (let i = 0; i < TOTAL_PUBLICADAS; i++) {
    const conFoto = i % 3 !== 2;
    await prisma.propiedad.create({
      data: {
        ...propiedadDePrueba(i, vendedor.id, tiposPorNombre, 'publicado'),
        ...(conFoto && {
          fotos: {
            create: {
              url:          `https://picsum.photos/seed/homescope-${i + 1}/800/600`,
              public_id:    `seed-catalogo/${i + 1}`,
              orden:        1,
              es_portada:   true,
              tamano_bytes: 0,
            },
          },
        }),
      },
    });
  }

  console.log('📝 Creando 3 en borrador y 2 pausadas (no deben verse en el catálogo)...');
  const ocultas = ['borrador', 'borrador', 'borrador', 'pausado', 'pausado'];
  for (const [j, estado] of ocultas.entries()) {
    const datos = propiedadDePrueba(TOTAL_PUBLICADAS + j, vendedor.id, tiposPorNombre, estado);
    await prisma.propiedad.create({ data: { ...datos, titulo: `NO DEBE APARECER (${estado}) #${j + 1}` } });
  }

  const totalPublicadas = await prisma.propiedad.count({ where: { estado: 'publicado' } });
  console.log(`\n✅ Listo. Total de propiedades publicadas en la BD: ${totalPublicadas}`);
  console.log(`   Con pageSize 12 → ${Math.ceil(totalPublicadas / 12)} páginas en el catálogo`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
