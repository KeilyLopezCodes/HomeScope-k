import { prisma } from '../../config/prisma.js';

const RESENA_SELECT = {
  id: true, calificacion: true, comentario: true, fecha_creacion: true,
  // Del comprador solo el nombre; nunca correo ni teléfono (RNF-08)
  comprador: { select: { id: true, nombre: true } },
  propiedad: { select: { id: true, titulo: true } },
};

export class ReputacionRepository {
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
}
