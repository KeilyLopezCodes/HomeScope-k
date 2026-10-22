// Avisos a los administradores cuando hay algo nuevo que moderar: un reporte (publicación, usuario o
// comentario de zona) o una solicitud de verificación de vendedor. Llegan como notificación (campana y
// tiempo real); referencia_tipo indica la sección del panel de administración a la que llevan.
import { IdentidadRepository } from '../identidad/identidad.repository.js';
import { ComunicacionService } from '../comunicacion/comunicacion.service.js';

const identidadRepo = new IdentidadRepository();
const comunicacion  = new ComunicacionService();

const MOTIVOS = {
  spam:              'spam',
  ofensivo:          'contenido ofensivo',
  informacion_falsa: 'información falsa',
  datos_personales:  'datos personales',
  fraude:            'posible fraude',
  otro:              'otro motivo',
};
const TIPOS_DOCUMENTO = { dpi: 'DPI', pasaporte: 'pasaporte', licencia: 'licencia de conducir' };
const recortar = (texto, max = 140) => (texto && texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

// Envía la notificación a todos los administradores activos (menos a quien originó la acción).
// Nunca hace fallar la acción: si un aviso no se puede enviar, solo se registra en el log
export async function avisarAdministradores({ titulo, contenido, referencia_tipo, referencia_id, excepto = null }) {
  try {
    const admins = (await identidadRepo.idsAdministradoresActivos()).filter((id) => id !== excepto);
    const resultados = await Promise.allSettled(admins.map((id) =>
      comunicacion.notificar(id, { tipo: 'moderacion', titulo, contenido, referencia_tipo, referencia_id })));
    resultados
      .filter((r) => r.status === 'rejected')
      .forEach((r) => console.error('No se pudo avisar a un administrador:', r.reason?.message));
  } catch (err) {
    console.error('No se pudo avisar a los administradores:', err.message);
  }
}

// Reporte nuevo. objetivo: { titulo } de la publicación, { nombre } del usuario o { texto } del comentario
export function avisarReporte({ reporte, tipo, objetivo, reportanteId }) {
  const motivo = MOTIVOS[reporte.motivo] ?? reporte.motivo;
  const detalle = reporte.descripcion ? ` — "${recortar(reporte.descripcion, 120)}"` : '';
  const avisos = {
    propiedad:  { titulo: 'Publicación reportada',         contenido: `"${recortar(objetivo.titulo, 80)}" fue reportada por ${motivo}${detalle}` },
    usuario:    { titulo: 'Usuario reportado',             contenido: `${objetivo.nombre} fue reportado por ${motivo}${detalle}` },
    comentario: { titulo: 'Comentario de zona reportado',  contenido: `"${recortar(objetivo.texto, 80)}" fue reportado por ${motivo}${detalle}` },
  };
  return avisarAdministradores({
    ...avisos[tipo],
    referencia_tipo: `reporte_${tipo}`, // reporte_propiedad | reporte_usuario | reporte_comentario
    referencia_id:   reporte.id,
    excepto:         reportanteId,
  });
}

// Solicitud de verificación de identidad nueva
export async function avisarVerificacion({ solicitud, vendedorId }) {
  const vendedor = await identidadRepo.datosModeracion(vendedorId).catch(() => null);
  const nombre = [vendedor?.nombre, vendedor?.apellido].filter(Boolean).join(' ') || 'Un vendedor';
  return avisarAdministradores({
    titulo:          'Solicitud de verificación',
    contenido:       `${nombre} envió su ${TIPOS_DOCUMENTO[solicitud.tipo_documento] ?? 'documento'} para verificar su identidad y poder publicar.`,
    referencia_tipo: 'verificacion_vendedor',
    referencia_id:   solicitud.id,
    excepto:         vendedorId,
  });
}
