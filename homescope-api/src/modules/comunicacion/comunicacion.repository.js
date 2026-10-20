import { prisma } from '../../config/prisma.js';

// De los participantes solo se exponen id y nombre: nunca correo ni teléfono (RNF-08)
const USUARIO_PUBLICO = { select: { id: true, nombre: true } };

const MENSAJE_SELECT = {
  id: true, conversacion_id: true, contenido: true, fecha_envio: true, leido_en: true,
  remitente: USUARIO_PUBLICO,
};

const NOTIFICACION_SELECT = {
  id: true, tipo: true, titulo: true, contenido: true,
  referencia_tipo: true, referencia_id: true, leida: true, fecha_creacion: true,
};

export class ComunicacionRepository {
  // Regla RNF-08: contacto visible solo si existe conversación entre comprador y vendedor
  async existeConversacion(propiedadId, compradorId) {
    const conv = await prisma.conversacion.findUnique({
      where: { propiedad_id_comprador_id: { propiedad_id: propiedadId, comprador_id: compradorId } },
      select: { id: true },
    });
    return conv !== null;
  }

  // ¿El comprador escribió al menos un mensaje en la conversación de esa propiedad? (reseñas, RF-30)
  async compradorEscribio(propiedadId, compradorId) {
    const conv = await prisma.conversacion.findFirst({
      where:  { propiedad_id: propiedadId, comprador_id: compradorId, mensajes: { some: { remitente_id: compradorId } } },
      select: { id: true },
    });
    return conv !== null;
  }

  // ── Conversaciones ─────────────────────────────────────────────────────────

  async buscarPorPropiedadYComprador(propiedadId, compradorId) {
    return prisma.conversacion.findUnique({
      where:  { propiedad_id_comprador_id: { propiedad_id: propiedadId, comprador_id: compradorId } },
      select: { id: true },
    });
  }

  async crear(propiedadId, compradorId, vendedorId) {
    return prisma.conversacion.create({
      data:   { propiedad_id: propiedadId, comprador_id: compradorId, vendedor_id: vendedorId },
      select: { id: true },
    });
  }

  async buscarPorId(id) {
    return prisma.conversacion.findUnique({
      where: { id },
      select: {
        id: true, comprador_id: true, vendedor_id: true, fecha_inicio: true, ultimo_mensaje_en: true,
        propiedad: { select: { id: true, titulo: true } },
        comprador: USUARIO_PUBLICO,
        vendedor:  USUARIO_PUBLICO,
      },
    });
  }

  // Conversaciones del usuario (como comprador o vendedor), la de actividad más reciente primero,
  // con su último mensaje y cuántos mensajes recibidos no ha leído
  async listarPorUsuario(usuarioId, { page, pageSize }) {
    const where = { OR: [{ comprador_id: usuarioId }, { vendedor_id: usuarioId }] };
    const [items, total] = await prisma.$transaction([
      prisma.conversacion.findMany({
        where,
        orderBy: [{ ultimo_mensaje_en: { sort: 'desc', nulls: 'last' } }, { fecha_inicio: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select: {
          id: true, comprador_id: true, vendedor_id: true, fecha_inicio: true, ultimo_mensaje_en: true,
          propiedad: {
            select: {
              id: true, titulo: true,
              fotos: { where: { es_portada: true }, select: { url: true }, take: 1 },
            },
          },
          comprador: USUARIO_PUBLICO,
          vendedor:  USUARIO_PUBLICO,
          mensajes:  { orderBy: { fecha_envio: 'desc' }, take: 1, select: MENSAJE_SELECT },
          _count: {
            select: { mensajes: { where: { leido_en: null, remitente_id: { not: usuarioId } } } },
          },
        },
      }),
      prisma.conversacion.count({ where }),
    ]);
    return { items, total };
  }

  // ── Mensajes ───────────────────────────────────────────────────────────────

  // Página de mensajes, del más reciente al más antiguo
  async listarMensajes(conversacionId, { page, pageSize }) {
    const where = { conversacion_id: conversacionId };
    const [items, total] = await prisma.$transaction([
      prisma.mensaje.findMany({
        where,
        orderBy: [{ fecha_envio: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  MENSAJE_SELECT,
      }),
      prisma.mensaje.count({ where }),
    ]);
    return { items, total };
  }

  // Guarda el mensaje y actualiza la actividad de la conversación en una transacción
  async crearMensaje(conversacionId, remitenteId, contenido) {
    return prisma.$transaction(async (tx) => {
      const mensaje = await tx.mensaje.create({
        data:   { conversacion_id: conversacionId, remitente_id: remitenteId, contenido },
        select: MENSAJE_SELECT,
      });
      await tx.conversacion.update({
        where: { id: conversacionId },
        data:  { ultimo_mensaje_en: mensaje.fecha_envio },
      });
      return mensaje;
    });
  }

  // Marca como leídos los mensajes que el usuario recibió en la conversación y sus notificaciones
  async marcarLeida(conversacionId, usuarioId) {
    const [mensajes, notificaciones] = await prisma.$transaction([
      prisma.mensaje.updateMany({
        where: { conversacion_id: conversacionId, remitente_id: { not: usuarioId }, leido_en: null },
        data:  { leido_en: new Date() },
      }),
      prisma.notificacion.updateMany({
        where: { usuario_id: usuarioId, referencia_tipo: 'conversacion', referencia_id: conversacionId, leida: false },
        data:  { leida: true },
      }),
    ]);
    return { mensajes: mensajes.count, notificaciones: notificaciones.count };
  }

  // ── Notificaciones ─────────────────────────────────────────────────────────

  // Una sola notificación sin leer por conversación: si ya hay una, se actualiza con el último mensaje
  // en lugar de llenar la bandeja con una notificación por cada mensaje
  async notificarMensaje(usuarioId, conversacionId, { titulo, contenido }) {
    const pendiente = await prisma.notificacion.findFirst({
      where:  { usuario_id: usuarioId, tipo: 'mensaje', referencia_tipo: 'conversacion', referencia_id: conversacionId, leida: false },
      select: { id: true },
    });
    const datos = { titulo, contenido, fecha_creacion: new Date() };
    return pendiente
      ? prisma.notificacion.update({ where: { id: pendiente.id }, data: datos, select: NOTIFICACION_SELECT })
      : prisma.notificacion.create({
        data: {
          ...datos, usuario_id: usuarioId, tipo: 'mensaje',
          referencia_tipo: 'conversacion', referencia_id: conversacionId,
        },
        select: NOTIFICACION_SELECT,
      });
  }

  // Notificación genérica (visitas, recordatorios…); `referencia` apunta al recurso que la originó
  async crearNotificacion(usuarioId, { tipo, titulo, contenido, referencia_tipo = null, referencia_id = null }) {
    return prisma.notificacion.create({
      data:   { usuario_id: usuarioId, tipo, titulo, contenido, referencia_tipo, referencia_id },
      select: NOTIFICACION_SELECT,
    });
  }

  async listarNotificaciones(usuarioId, { page, pageSize, leida }) {
    const where = { usuario_id: usuarioId, ...(leida !== undefined && { leida }) };
    const [items, total, no_leidas] = await prisma.$transaction([
      prisma.notificacion.findMany({
        where,
        orderBy: [{ fecha_creacion: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  NOTIFICACION_SELECT,
      }),
      prisma.notificacion.count({ where }),
      prisma.notificacion.count({ where: { usuario_id: usuarioId, leida: false } }),
    ]);
    return { items, total, no_leidas };
  }

  // Solo actualiza si la notificación es del usuario; devuelve null si no existe o es de otro
  async actualizarNotificacion(id, usuarioId, leida) {
    const { count } = await prisma.notificacion.updateMany({ where: { id, usuario_id: usuarioId }, data: { leida } });
    return count ? prisma.notificacion.findUnique({ where: { id }, select: NOTIFICACION_SELECT }) : null;
  }
}
