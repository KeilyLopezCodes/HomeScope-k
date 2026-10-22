// Notificaciones de moderación (solo administradores): a qué sección del panel llevan
const RUTAS_MODERACION = {
  reporte_propiedad:     '/admin/publicaciones',
  reporte_usuario:       '/admin/usuarios',
  reporte_comentario:    '/admin/comentarios',
  verificacion_vendedor: '/admin/verificaciones',
};

// A dónde lleva cada notificación según el recurso que la originó.
// usuarioId: quien la recibe (una reseña nueva lleva al vendedor a su propio perfil)
export function rutaDeNotificacion(n, usuarioId) {
  if (RUTAS_MODERACION[n.referencia_tipo]) return RUTAS_MODERACION[n.referencia_tipo];
  if (n.referencia_tipo === 'conversacion') return `/mensajes/${n.referencia_id}`;
  if (n.referencia_tipo === 'visita') return '/visitas';
  if (n.referencia_tipo === 'resena' && usuarioId) return `/vendedores/${usuarioId}`;
  return null;
}

export const ACCION_NOTIFICACION = {
  conversacion: 'Abrir conversación',
  visita:       'Ver visitas',
  resena:       'Ver reseñas',
  reporte_propiedad:     'Revisar publicación',
  reporte_usuario:       'Revisar usuario',
  reporte_comentario:    'Revisar comentario',
  verificacion_vendedor: 'Revisar solicitud',
};
