import { prisma } from '../../config/prisma.js';

export class ComunicacionRepository {
  // Regla RNF-08: contacto visible solo si existe conversación entre comprador y vendedor
  async existeConversacion(propiedadId, compradorId) {
    const conv = await prisma.conversacion.findUnique({
      where: { propiedad_id_comprador_id: { propiedad_id: propiedadId, comprador_id: compradorId } },
      select: { id: true },
    });
    return conv !== null;
  }

  async listarPorUsuario(usuarioId) {
    return prisma.conversacion.findMany({
      where: { OR: [{ comprador_id: usuarioId }, { vendedor_id: usuarioId }] },
      orderBy: { fecha_inicio: 'desc' },
      select: {
        id: true, fecha_inicio: true, ultimo_mensaje_en: true,
        propiedad: { select: { id: true, titulo: true } },
        comprador: { select: { id: true, nombre: true } },
        vendedor:  { select: { id: true, nombre: true } },
      },
    });
  }

  async crear(propiedadId, compradorId, vendedorId) {
    return prisma.conversacion.create({
      data: { propiedad_id: propiedadId, comprador_id: compradorId, vendedor_id: vendedorId },
    });
  }

  async buscarPorId(id) {
    return prisma.conversacion.findUnique({
      where: { id },
      select: {
        id: true, comprador_id: true, vendedor_id: true,
        propiedad: { select: { id: true, titulo: true } },
      },
    });
  }
}
