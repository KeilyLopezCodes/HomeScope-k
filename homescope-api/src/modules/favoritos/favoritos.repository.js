import { prisma } from '../../config/prisma.js';

const PROPIEDAD_SELECT = {
  id: true, titulo: true, direccion: true, precio: true, moneda: true,
  modalidad: true, estado: true, zona: true, municipio: true, departamento: true,
  habitaciones: true, banos: true, area_m2: true,
  tipo_propiedad: { select: { nombre: true } },
  vendedor: { select: { id: true, nombre: true } },
  fotos:    { where: { es_portada: true }, select: { url: true }, take: 1 },
};

export class FavoritosRepository {
  // Las guardadas por el usuario, la más reciente primero (también las que ya no están publicadas)
  async listar(usuarioId) {
    const rows = await prisma.favorito.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { fecha_agregado: 'desc' },
      select: { fecha_agregado: true, propiedad: { select: PROPIEDAD_SELECT } },
    });
    return rows.map((r) => ({ ...r.propiedad, guardado_en: r.fecha_agregado }));
  }

  async agregar(usuarioId, propiedadId) {
    return prisma.favorito.create({ data: { usuario_id: usuarioId, propiedad_id: propiedadId } });
  }

  async eliminar(usuarioId, propiedadId) {
    return prisma.favorito.deleteMany({ where: { usuario_id: usuarioId, propiedad_id: propiedadId } });
  }

  async existe(usuarioId, propiedadId) {
    return prisma.favorito.findUnique({ where: { usuario_id_propiedad_id: { usuario_id: usuarioId, propiedad_id: propiedadId } } });
  }

  // Para el panel del vendedor. Cuenta los favoritos vigentes: si alguien quita uno, deja de contar
  // → [{ propiedad_id, total, periodo }]
  async contarPorPropiedades(ids, desde) {
    return prisma.$queryRaw`
      SELECT propiedad_id,
             count(*)::int                                        AS total,
             count(*) FILTER (WHERE fecha_agregado >= ${desde})::int AS periodo
        FROM favorito
       WHERE propiedad_id = ANY(${ids}::int[])
       GROUP BY propiedad_id`;
  }

  // Favoritos agregados por día (hora de Guatemala) → [{ fecha: 'YYYY-MM-DD', total }]
  async porDia(ids, desde) {
    return prisma.$queryRaw`
      SELECT to_char(fecha_agregado AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD') AS fecha, count(*)::int AS total
        FROM favorito
       WHERE propiedad_id = ANY(${ids}::int[]) AND fecha_agregado >= ${desde}
       GROUP BY 1`;
  }

  // Estadísticas de la plataforma: favoritos agregados en el período (los que siguen guardados)
  async contarDesde(desde) {
    return prisma.favorito.count({ where: { fecha_agregado: { gte: desde } } });
  }
}
