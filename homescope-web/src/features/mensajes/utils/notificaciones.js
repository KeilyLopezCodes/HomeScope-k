// A dónde lleva cada notificación según el recurso que la originó
export function rutaDeNotificacion(n) {
  if (n.referencia_tipo === 'conversacion') return `/mensajes/${n.referencia_id}`;
  if (n.referencia_tipo === 'visita') return '/visitas';
  return null;
}
