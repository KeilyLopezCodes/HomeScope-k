import { z } from 'zod';
import { PERIODOS_ESTADISTICAS } from '../../shared/utils/periodo.js';

export const MOTIVOS_REPORTE = ['spam', 'ofensivo', 'informacion_falsa', 'datos_personales', 'fraude', 'otro'];
export const ESTADOS_REPORTE = ['pendiente', 'en_revision', 'resuelto', 'descartado'];
export const TIPOS_OBJETIVO  = ['propiedad', 'usuario', 'comentario'];

// Acciones que el administrador ejecuta sobre cada tipo de objetivo
export const ACCIONES_PROPIEDAD = ['aprobar', 'pausar', 'eliminar'];
export const ACCIONES_USUARIO   = ['aprobar', 'suspender', 'reactivar'];
// Las que además se registran al atender un reporte de comentario (PUT /admin/reportes/:id)
export const ACCIONES = [...new Set([...ACCIONES_PROPIEDAD, ...ACCIONES_USUARIO]), 'ocultar_comentario', 'descartar_reporte'];

const id = (mensaje) => z.coerce.number({ required_error: mensaje, invalid_type_error: mensaje }).int().positive();
const textoLimpio = (max, requerido = 'Campo obligatorio') => z.string({ required_error: requerido })
  .transform((v) => v.replace(/<[^>]*>/g, '').trim())
  .pipe(z.string().max(max));
const paginacion = {
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
};
// ?reportadas=true|false
const booleano = z.enum(['true', 'false']).transform((v) => v === 'true');

// POST /reportes: un comentario de zona, una publicación o un usuario
const camposReporte = {
  motivo: z.enum(MOTIVOS_REPORTE, { errorMap: () => ({ message: `Motivos válidos: ${MOTIVOS_REPORTE.join(', ')}` }) }),
  descripcion: textoLimpio(1000).optional().transform((v) => v || null),
};
export const crearReporteSchema = z.discriminatedUnion('tipo_objetivo', [
  z.object({ tipo_objetivo: z.literal('comentario'), comentario_zona_id: id('Indica el comentario que reportas'), ...camposReporte }),
  z.object({ tipo_objetivo: z.literal('propiedad'), propiedad_id: id('Indica la publicación que reportas'), ...camposReporte }),
  z.object({ tipo_objetivo: z.literal('usuario'), usuario_reportado_id: id('Indica el usuario que reportas'), ...camposReporte }),
], { errorMap: () => ({ message: `tipo_objetivo debe ser ${TIPOS_OBJETIVO.join(', ')}` }) })
  .refine((r) => r.motivo !== 'otro' || r.descripcion, {
    message: 'Cuéntanos el motivo cuando eliges "otro"', path: ['descripcion'],
  });

// GET /admin/reportes?estado=pendiente&tipo=propiedad
export const listarReportesSchema = z.object({
  estado: z.enum(ESTADOS_REPORTE).optional(),
  tipo:   z.enum(TIPOS_OBJETIVO).optional(),
  ...paginacion,
});

// PUT /admin/reportes/:id
export const resolverReporteSchema = z.object({
  estado: z.enum(['en_revision', 'resuelto', 'descartado'], {
    errorMap: () => ({ message: 'estado debe ser en_revision, resuelto o descartado' }),
  }),
  // Al resolver un reporte de comentario, el administrador puede ocultarlo para todos
  ocultar_comentario: z.boolean().default(false),
  motivo: textoLimpio(300).optional(),
}).refine((r) => !r.ocultar_comentario || r.estado === 'resuelto', {
  message: 'Solo se oculta el comentario al resolver el reporte (estado: resuelto)', path: ['ocultar_comentario'],
});

// GET /admin/propiedades?reportadas=true&estado=publicado  |  ?pausadas_por_moderacion=true
export const listarPropiedadesAdminSchema = z.object({
  reportadas: booleano.default('true'),
  // Las que moderación pausó y aún no aprueba (sus reportes ya quedaron resueltos, por eso no salen como reportadas)
  pausadas_por_moderacion: booleano.default('false'),
  estado:     z.enum(['borrador', 'publicado', 'pausado', 'vendido', 'alquilado']).optional(),
  ...paginacion,
});

// GET /admin/usuarios?reportados=true&estado=suspendido&q=ana
export const listarUsuariosAdminSchema = z.object({
  reportados: booleano.default('false'),
  estado:     z.enum(['pendiente', 'activo', 'suspendido', 'inhabilitado']).optional(),
  q:          z.string().trim().max(100).optional().transform((v) => v || undefined),
  ...paginacion,
});

// POST /admin/acciones: el motivo es obligatorio porque queda en el registro
const motivoAccion = textoLimpio(300, 'Explica el motivo de la acción: queda en el registro').pipe(z.string().min(5, 'Explica el motivo de la acción (mínimo 5 caracteres)'));
// El objetivo es una publicación (propiedad_id) o un usuario (usuario_id), nunca los dos
export const crearAccionSchema = z.object({
  accion:       z.enum([...new Set([...ACCIONES_PROPIEDAD, ...ACCIONES_USUARIO])], {
    errorMap: () => ({ message: `Acciones válidas: ${ACCIONES_PROPIEDAD.join(', ')} (publicación); ${ACCIONES_USUARIO.join(', ')} (usuario)` }),
  }),
  propiedad_id: id('propiedad_id inválido').optional(),
  usuario_id:   id('usuario_id inválido').optional(),
  motivo:       motivoAccion,
  reporte_id:   id('reporte_id inválido').optional(),
}).superRefine((a, ctx) => {
  if (Boolean(a.propiedad_id) === Boolean(a.usuario_id))
    return ctx.addIssue({ code: 'custom', path: ['propiedad_id'], message: 'Indica propiedad_id o usuario_id (solo uno)' });
  if (a.propiedad_id && !ACCIONES_PROPIEDAD.includes(a.accion))
    ctx.addIssue({ code: 'custom', path: ['accion'], message: `Sobre una publicación: ${ACCIONES_PROPIEDAD.join(', ')}` });
  if (a.usuario_id && !ACCIONES_USUARIO.includes(a.accion))
    ctx.addIssue({ code: 'custom', path: ['accion'], message: `Sobre un usuario: ${ACCIONES_USUARIO.join(', ')}` });
});

// GET /admin/acciones?propiedad_id=&usuario_id=&accion=
export const listarAccionesSchema = z.object({
  propiedad_id:     id('propiedad_id inválido').optional(),
  usuario_id:       id('usuario_id inválido').optional(),
  administrador_id: id('administrador_id inválido').optional(),
  accion:           z.enum(ACCIONES).optional(),
  ...paginacion,
});

// GET /admin/estadisticas?dias=30
export const estadisticasPlataformaSchema = z.object({
  dias: z.coerce.number().int()
    .refine((d) => PERIODOS_ESTADISTICAS.includes(d), 'El período debe ser de 7, 30 o 90 días')
    .default(30),
});

// TODO: verificación de vendedores
export const resolverVerificacionSchema = z.object({});
