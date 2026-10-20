import { apiClient } from '../../../shared/api/client';

const consulta = (params) => new URLSearchParams(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null),
);

// ── Conversaciones ───────────────────────────────────────────────────────────

export const listarConversaciones = ({ page = 1, pageSize = 30 } = {}) =>
  apiClient(`/api/v1/conversaciones?${consulta({ page, pageSize })}`);

// Una por propiedad y comprador: si ya existe se reutiliza → { creada, conversacion, mensaje }
export const iniciarConversacion = (propiedadId, mensaje) =>
  apiClient('/api/v1/conversaciones', {
    method: 'POST',
    body: JSON.stringify({ propiedad_id: propiedadId, ...(mensaje && { mensaje }) }),
  });

// Página de mensajes, del más reciente al más antiguo → { conversacion, data, total, page, pageSize }
export const obtenerMensajes = (conversacionId, { page = 1, pageSize = 30 } = {}) =>
  apiClient(`/api/v1/conversaciones/${conversacionId}/mensajes?${consulta({ page, pageSize })}`);

export const enviarMensaje = (conversacionId, contenido) =>
  apiClient(`/api/v1/conversaciones/${conversacionId}/mensajes`, {
    method: 'POST',
    body: JSON.stringify({ contenido }),
  });

export const marcarConversacionLeida = (conversacionId) =>
  apiClient(`/api/v1/conversaciones/${conversacionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ leida: true }),
  });

// ── Notificaciones ───────────────────────────────────────────────────────────

export const listarNotificaciones = ({ page = 1, pageSize = 8, leida } = {}) =>
  apiClient(`/api/v1/notificaciones?${consulta({ page, pageSize, leida })}`);

export const marcarNotificacion = (id, leida = true) =>
  apiClient(`/api/v1/notificaciones/${id}`, { method: 'PATCH', body: JSON.stringify({ leida }) });
