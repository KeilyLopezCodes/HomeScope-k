// A dónde lleva cada notificación según el recurso que la originó.
// usuarioId: quien la recibe (una reseña nueva lleva al vendedor a su propio perfil)
export function rutaDeNotificacion(n, usuarioId) {
  if (n.referencia_tipo === 'conversacion') return `/mensajes/${n.referencia_id}`;
  if (n.referencia_tipo === 'visita') return '/visitas';
  if (n.referencia_tipo === 'resena' && usuarioId) return `/vendedores/${usuarioId}`;
  return null;
}

export const ACCION_NOTIFICACION = {
  conversacion: 'Abrir conversación',
  visita:       'Ver visitas',
  resena:       'Ver reseñas',
};
