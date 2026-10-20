import { prisma } from '../../config/prisma.js';

export const ESTADOS_ABIERTOS = ['pendiente', 'en_revision'];

const REPORTE_SELECT = {
  id: true, tipo_objetivo: true, motivo: true, descripcion: true, estado: true, fecha_creacion: true,
  reportante: { select: { id: true, nombre: true } },
  comentario_zona: {
    select: {
      id: true, comentario: true, estado: true, fecha_creacion: true,
      usuario:   { select: { id: true, nombre: true } },
      propiedad: { select: { id: true, titulo: true } },
      // Cuántas personas lo tienen reportado ahora mismo (ayuda a priorizar la cola)
      _count: { select: { reportes: { where: { estado: { in: ESTADOS_ABIERTOS } } } } },
    },
  },
};

export class ModeracionRepository {
  async crearReporte({ reportanteId, comentarioZonaId, motivo, descripcion }) {
    return prisma.reporte.create({
      data: {
        reportante_id: reportanteId, tipo_objetivo: 'comentario', comentario_zona_id: comentarioZonaId,
        motivo, descripcion,
      },
      select: REPORTE_SELECT,
    });
  }

  // Cola del administrador: los más antiguos primero (se atienden en orden de llegada)
  async listarReportes({ estado, page, pageSize }) {
    const where = estado ? { estado } : {};
    const [items, total, abiertos] = await prisma.$transaction([
      prisma.reporte.findMany({
        where,
        orderBy: [{ fecha_creacion: estado && !ESTADOS_ABIERTOS.includes(estado) ? 'desc' : 'asc' }, { id: 'asc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  REPORTE_SELECT,
      }),
      prisma.reporte.count({ where }),
      prisma.reporte.count({ where: { estado: { in: ESTADOS_ABIERTOS } } }),
    ]);
    return { items, total, abiertos };
  }

  async buscarReporte(id) {
    return prisma.reporte.findUnique({ where: { id }, select: REPORTE_SELECT });
  }

  async cambiarEstado(id, estado) {
    return prisma.reporte.update({ where: { id }, data: { estado }, select: REPORTE_SELECT });
  }

  // Al ocultar un comentario, todos sus reportes abiertos quedan resueltos
  async resolverAbiertosDeComentario(comentarioZonaId) {
    return prisma.reporte.updateMany({
      where: { comentario_zona_id: comentarioZonaId, estado: { in: ESTADOS_ABIERTOS } },
      data:  { estado: 'resuelto' },
    });
  }
}
