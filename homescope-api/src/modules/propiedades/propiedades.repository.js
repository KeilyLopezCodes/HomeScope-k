import { prisma } from '../../config/prisma.js';

const VENDEDOR_PUBLICO = { id: true, nombre: true };

const PROPIEDAD_LISTA = {
  id: true, titulo: true, direccion: true, precio: true, moneda: true,
  modalidad: true, estado: true, fecha_creacion: true,
  tipo_propiedad: { select: { nombre: true } },
  vendedor:       { select: VENDEDOR_PUBLICO },
  fotos: {
    where:   { es_portada: true },
    select:  { url: true },
    take:    1,
  },
};

export class PropiedadesRepository {
  // ── Lectura ────────────────────────────────────────────────────────────────

  async listar({ page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    return prisma.propiedad.findMany({
      where:   { estado: 'publicado' },
      skip,
      take:    limit,
      orderBy: { fecha_creacion: 'desc' },
      select:  PROPIEDAD_LISTA,
    });
  }

  async buscarPorId(id) {
    return prisma.propiedad.findUnique({
      where:  { id },
      select: {
        id: true, titulo: true, descripcion: true, direccion: true,
        precio: true, moneda: true, modalidad: true, estado: true,
        habitaciones: true, banos: true, area_m2: true, parqueos: true,
        zona: true, municipio: true, departamento: true,
        latitud: true, longitud: true, paso_formulario: true,
        fecha_creacion: true, fecha_actualizacion: true,
        tipo_propiedad: { select: { id: true, nombre: true } },
        vendedor: {
          select: { id: true, nombre: true, apellido: true, email: true, telefono: true },
        },
        fotos: {
          select:  { id: true, url: true, orden: true, es_portada: true },
          orderBy: { orden: 'asc' },
        },
      },
    });
  }

  async listarPorVendedor(vendedorId) {
    return prisma.propiedad.findMany({
      where:   { vendedor_id: vendedorId },
      orderBy: { fecha_creacion: 'desc' },
      select:  {
        id: true, titulo: true, direccion: true, precio: true, moneda: true,
        modalidad: true, estado: true, paso_formulario: true, fecha_creacion: true,
        tipo_propiedad: { select: { nombre: true } },
        fotos: {
          where:  { es_portada: true },
          select: { url: true },
          take:   1,
        },
      },
    });
  }

  async listarVistas(usuarioId, limit = 20) {
    const rows = await prisma.vistaPropiedad.findMany({
      where:    { usuario_id: usuarioId },
      orderBy:  { fecha_vista: 'desc' },
      take:     limit,
      distinct: ['propiedad_id'],
      select:   {
        fecha_vista: true,
        propiedad:   { select: PROPIEDAD_LISTA },
      },
    });
    return rows.map((r) => ({ ...r.propiedad, fecha_vista: r.fecha_vista }));
  }

  async registrarVista(usuarioId, propiedadId, origen = 'catalogo') {
    return prisma.vistaPropiedad.create({
      data: { usuario_id: usuarioId, propiedad_id: propiedadId, origen },
    });
  }

  // ── Escritura ──────────────────────────────────────────────────────────────

  async crear(datos) {
    return prisma.propiedad.create({
      data:   datos,
      select: { id: true, titulo: true, estado: true, fecha_creacion: true },
    });
  }

  async actualizar(id, datos) {
    return prisma.propiedad.update({
      where:  { id },
      data:   datos,
      select: { id: true, titulo: true, estado: true, fecha_actualizacion: true },
    });
  }

  async eliminar(id) {
    return prisma.propiedad.delete({ where: { id } });
  }

  // Cambia estado y registra fecha_publicacion si pasa a 'publicado'
  async cambiarEstado(id, nuevoEstado) {
    return prisma.propiedad.update({
      where: { id },
      data:  {
        estado: nuevoEstado,
        ...(nuevoEstado === 'publicado' && { fecha_publicacion: new Date() }),
      },
      select: { id: true, estado: true },
    });
  }

  // Registra cambio de precio en historial
  async registrarHistorialPrecio(propiedadId, precioAnterior, precioNuevo, usuarioId) {
    return prisma.historialPrecio.create({
      data: {
        propiedad_id:    propiedadId,
        precio_anterior: precioAnterior,
        precio_nuevo:    precioNuevo,
        cambiado_por:    usuarioId,
      },
    });
  }
}
