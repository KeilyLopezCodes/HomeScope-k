import { prisma } from '../../config/prisma.js';

const RESENA_SELECT = {
  id: true, calificacion: true, comentario: true, fecha_creacion: true,
  // Del comprador solo el nombre; nunca correo ni teléfono (RNF-08)
  comprador: { select: { id: true, nombre: true } },
  propiedad: { select: { id: true, titulo: true } },
};

const COMENTARIO_SELECT = {
  id: true, comentario: true, estado: true, fecha_creacion: true, propiedad_id: true,
  usuario: { select: { id: true, nombre: true } },
};

export class ReputacionRepository {
  // ── Comentarios de la zona ─────────────────────────────────────────────────

  async buscarComentario(usuarioId, propiedadId) {
    return prisma.comentarioZona.findUnique({
      where:  { propiedad_id_usuario_id: { propiedad_id: propiedadId, usuario_id: usuarioId } },
      select: COMENTARIO_SELECT,
    });
  }

  async buscarComentarioPorId(id) {
    return prisma.comentarioZona.findUnique({ where: { id }, select: COMENTARIO_SELECT });
  }

  async crearComentario(usuarioId, propiedadId, comentario) {
    return prisma.comentarioZona.create({
      data:   { usuario_id: usuarioId, propiedad_id: propiedadId, comentario },
      select: COMENTARIO_SELECT,
    });
  }

  // Solo los visibles, del más reciente al más antiguo
  async listarComentarios(propiedadId, { page, pageSize }) {
    const where = { propiedad_id: propiedadId, estado: 'visible' };
    const [items, total] = await prisma.$transaction([
      prisma.comentarioZona.findMany({
        where,
        orderBy: [{ fecha_creacion: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  COMENTARIO_SELECT,
      }),
      prisma.comentarioZona.count({ where }),
    ]);
    return { items, total };
  }

  async cambiarEstadoComentario(id, estado, db = prisma) {
    return db.comentarioZona.update({ where: { id }, data: { estado }, select: COMENTARIO_SELECT });
  }

  // ── Reseñas ────────────────────────────────────────────────────────────────

  async buscarDeComprador(compradorId, propiedadId) {
    return prisma.resena.findUnique({
      where:  { comprador_id_propiedad_id: { comprador_id: compradorId, propiedad_id: propiedadId } },
      select: RESENA_SELECT,
    });
  }

  async crear({ vendedorId, compradorId, propiedadId, calificacion, comentario }) {
    return prisma.resena.create({
      data:   { vendedor_id: vendedorId, comprador_id: compradorId, propiedad_id: propiedadId, calificacion, comentario },
      select: RESENA_SELECT,
    });
  }

  async listarDeVendedor(vendedorId, { page, pageSize }) {
    const where = { vendedor_id: vendedorId };
    const [items, total] = await prisma.$transaction([
      prisma.resena.findMany({
        where,
        orderBy: [{ fecha_creacion: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  RESENA_SELECT,
      }),
      prisma.resena.count({ where }),
    ]);
    return { items, total };
  }

  // Promedio, total y cuántas reseñas hay de cada calificación, calculados en la BD con los datos actuales
  async resumenDeVendedor(vendedorId) {
    const [agregado, porCalificacion] = await prisma.$transaction([
      prisma.resena.aggregate({ where: { vendedor_id: vendedorId }, _avg: { calificacion: true }, _count: true }),
      prisma.resena.groupBy({ by: ['calificacion'], where: { vendedor_id: vendedorId }, _count: true, orderBy: { calificacion: 'asc' } }),
    ]);
    return {
      promedio:     agregado._avg.calificacion,
      total:        agregado._count,
      distribucion: Object.fromEntries(porCalificacion.map((g) => [g.calificacion, g._count])),
    };
  }

  // Estadísticas de la plataforma: reseñas del período y calificación promedio de todas
  async estadisticasPlataforma(desde) {
    const [nuevas, promedio] = await Promise.all([
      prisma.resena.count({ where: { fecha_creacion: { gte: desde } } }),
      prisma.resena.aggregate({ _avg: { calificacion: true }, _count: true }),
    ]);
    return { nuevas, total: promedio._count, promedio: promedio._avg.calificacion };
  }
}
