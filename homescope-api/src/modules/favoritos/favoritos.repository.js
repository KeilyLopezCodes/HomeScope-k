import { prisma } from '../../config/prisma.js';

const PROPIEDAD_SELECT = {
  id: true, titulo: true, direccion: true, precio: true, moneda: true,
  modalidad: true,
  tipo_propiedad: { select: { nombre: true } },
  vendedor: { select: { id: true, nombre: true } },
};

export class FavoritosRepository {
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
}
