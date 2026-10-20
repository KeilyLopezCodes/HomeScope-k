// Mensajería comprador ↔ vendedor por propiedad (arquitectura §10.3). Se escribe por REST para
// reutilizar validación, autorización y rate limiting; Socket.io solo avisa en tiempo real (ADR-06).
import { AppError } from '../../shared/errors/AppError.js';
import { realtime } from '../../shared/adapters/realtime.adapter.js';
import { ComunicacionRepository } from './comunicacion.repository.js';
import { PropiedadesService } from '../propiedades/propiedades.service.js';

const repo = new ComunicacionRepository();
const propiedadesService = new PropiedadesService();

const VISTA_PREVIA = 140;

// Los id de mensaje y notificación son BIGINT: JSON no serializa BigInt
const formatearMensaje = (m, usuarioId) => ({
  id:              Number(m.id),
  conversacion_id: m.conversacion_id,
  remitente:       m.remitente,
  es_mio:          m.remitente.id === usuarioId,
  contenido:       m.contenido,
  fecha_envio:     m.fecha_envio,
  leido_en:        m.leido_en,
});

const formatearNotificacion = (n) => ({ ...n, id: Number(n.id) });

// La misma conversación vista por cada participante: su rol y con quién habla
function formatearConversacion(c, usuarioId) {
  const soyComprador = c.comprador_id === usuarioId;
  return {
    id:                c.id,
    rol:               soyComprador ? 'comprador' : 'vendedor',
    propiedad:         { id: c.propiedad.id, titulo: c.propiedad.titulo, portada: c.propiedad.fotos?.[0]?.url ?? null },
    contraparte:       soyComprador ? c.vendedor : c.comprador,
    fecha_inicio:      c.fecha_inicio,
    ultimo_mensaje_en: c.ultimo_mensaje_en,
    ...(c.mensajes && { ultimo_mensaje: c.mensajes[0] ? formatearMensaje(c.mensajes[0], usuarioId) : null }),
    ...(c._count && { no_leidos: c._count.mensajes }),
  };
}

export class ComunicacionService {
  // POST /conversaciones: una conversación por propiedad y comprador; si ya existe se reutiliza
  async iniciarConversacion(compradorId, { propiedad_id, mensaje }) {
    const propiedad = await propiedadesService.datosParaConversacion(propiedad_id);
    if (!propiedad || propiedad.estado !== 'publicado')
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    if (propiedad.vendedor_id === compradorId)
      throw new AppError('PROPIEDAD_PROPIA', 'No puedes iniciar una conversación sobre tu propia propiedad', 422);

    let existente = await repo.buscarPorPropiedadYComprador(propiedad_id, compradorId);
    const creada = !existente;
    if (creada) {
      try {
        existente = await repo.crear(propiedad_id, compradorId, propiedad.vendedor_id);
      } catch (err) {
        // Dos solicitudes a la vez: la otra la creó primero (índice único propiedad + comprador)
        if (err.code !== 'P2002') throw err;
        existente = await repo.buscarPorPropiedadYComprador(propiedad_id, compradorId);
      }
    }

    const primerMensaje = mensaje ? await this.enviarMensaje(existente.id, compradorId, mensaje) : null;
    const conversacion = await repo.buscarPorId(existente.id);
    return { creada, conversacion: formatearConversacion(conversacion, compradorId), mensaje: primerMensaje };
  }

  async listarConversaciones(usuarioId, paginacion) {
    const { items, total } = await repo.listarPorUsuario(usuarioId, paginacion);
    return {
      data: items.map((c) => formatearConversacion(c, usuarioId)),
      total,
      ...paginacion,
    };
  }

  // Historial paginado, del mensaje más reciente al más antiguo
  async obtenerMensajes(conversacionId, usuarioId, paginacion) {
    const conversacion = await this._verificarParticipante(conversacionId, usuarioId);
    const { items, total } = await repo.listarMensajes(conversacionId, paginacion);
    return {
      conversacion: formatearConversacion(conversacion, usuarioId),
      data: items.map((m) => formatearMensaje(m, usuarioId)),
      total,
      ...paginacion,
    };
  }

  // Guarda el mensaje, notifica al destinatario y avisa en tiempo real a los dos participantes
  async enviarMensaje(conversacionId, remitenteId, contenido) {
    const conversacion = await this._verificarParticipante(conversacionId, remitenteId);
    const destinatarioId = conversacion.comprador_id === remitenteId ? conversacion.vendedor_id : conversacion.comprador_id;
    const remitente = conversacion.comprador_id === remitenteId ? conversacion.comprador : conversacion.vendedor;

    const mensaje = await repo.crearMensaje(conversacionId, remitenteId, contenido);
    const vistaPrevia = contenido.length > VISTA_PREVIA ? `${contenido.slice(0, VISTA_PREVIA - 1)}…` : contenido;
    const notificacion = await repo.notificarMensaje(destinatarioId, conversacionId, {
      titulo:    `Nuevo mensaje sobre "${conversacion.propiedad.titulo}"`.slice(0, 150),
      contenido: `${remitente.nombre}: ${vistaPrevia}`.slice(0, 500),
    });

    // El destinatario recibe el mensaje y la notificación; el remitente, su propio mensaje (otras pestañas)
    await Promise.all([
      realtime.emitToUser(destinatarioId, 'mensaje:nuevo', formatearMensaje(mensaje, destinatarioId)),
      realtime.emitToUser(destinatarioId, 'notificacion:nueva', formatearNotificacion(notificacion)),
      realtime.emitToUser(remitenteId, 'mensaje:nuevo', formatearMensaje(mensaje, remitenteId)),
    ]);

    return formatearMensaje(mensaje, remitenteId);
  }

  // PATCH /conversaciones/:id { leida: true }
  async marcarLeida(conversacionId, usuarioId) {
    await this._verificarParticipante(conversacionId, usuarioId);
    const marcados = await repo.marcarLeida(conversacionId, usuarioId);
    return { conversacion_id: conversacionId, mensajes_marcados: marcados.mensajes };
  }

  // ── Notificaciones ─────────────────────────────────────────────────────────

  async listarNotificaciones(usuarioId, filtros) {
    const { items, total, no_leidas } = await repo.listarNotificaciones(usuarioId, filtros);
    return { data: items.map(formatearNotificacion), total, no_leidas, page: filtros.page, pageSize: filtros.pageSize };
  }

  async actualizarNotificacion(id, usuarioId, leida) {
    const notificacion = await repo.actualizarNotificacion(id, usuarioId, leida);
    if (!notificacion) throw new AppError('NO_ENCONTRADO', 'Notificación no encontrada', 404);
    return formatearNotificacion(notificacion);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Para quien no participa, la conversación no existe (404): no se revela si hay una
  async _verificarParticipante(conversacionId, usuarioId) {
    const conversacion = await repo.buscarPorId(conversacionId);
    if (!conversacion || ![conversacion.comprador_id, conversacion.vendedor_id].includes(usuarioId))
      throw new AppError('NO_ENCONTRADO', 'Conversación no encontrada', 404);
    return conversacion;
  }
}
