import { prisma } from '../../config/prisma.js';

// Campos públicos del vendedor — nunca incluye email ni telefono
const VENDEDOR_PUBLICO = { id: true, nombre: true };

const PROPIEDAD_LISTA = {
  id: true, titulo: true, direccion: true, precio: true, moneda: true,
  modalidad: true, fecha_creacion: true,
  tipo_propiedad: { select: { nombre: true } },
  vendedor: { select: VENDEDOR_PUBLICO },
};

export class PropiedadesRepository {
  async listar({ page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    return prisma.propiedad.findMany({
      where: { estado: 'publicado' },
      skip,
      take: limit,
      orderBy: { fecha_creacion: 'desc' },
      select: PROPIEDAD_LISTA,
    });
  }

  async buscarPorId(id) {
    return prisma.propiedad.findUnique({
      where: { id },
      select: {
        id: true, titulo: true, descripcion: true, direccion: true,
        precio: true, moneda: true, modalidad: true, estado: true,
        habitaciones: true, banos: true, area_m2: true, parqueos: true,
        zona: true, municipio: true, departamento: true,
        latitud: true, longitud: true, fecha_creacion: true,
        tipo_propiedad: { select: { nombre: true } },
        vendedor: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
        fotos: { select: { url: true, orden: true, es_portada: true }, orderBy: { orden: 'asc' } },
      },
    });
  }

  async listarPorVendedor(vendedorId) {
    return prisma.propiedad.findMany({
      where: { vendedor_id: vendedorId },
      orderBy: { fecha_creacion: 'desc' },
      select: {
        id: true, titulo: true, direccion: true, precio: true, moneda: true,
        modalidad: true, estado: true, fecha_creacion: true,
        tipo_propiedad: { select: { nombre: true } },
      },
    });
  }

  async listarVistas(usuarioId, limit = 20) {
    const rows = await prisma.vistaPropiedad.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { fecha_vista: 'desc' },
      take: limit,
      distinct: ['propiedad_id'],
      select: {
        fecha_vista: true,
        propiedad: { select: PROPIEDAD_LISTA },
      },
    });
    return rows.map((r) => ({ ...r.propiedad, fecha_vista: r.fecha_vista }));
  }

  async registrarVista(usuarioId, propiedadId, origen = 'catalogo') {
    return prisma.vistaPropiedad.create({
      data: { usuario_id: usuarioId, propiedad_id: propiedadId, origen },
    });
  }

  async crear(datos) {
    return prisma.propiedad.create({ data: datos });
  }
}
