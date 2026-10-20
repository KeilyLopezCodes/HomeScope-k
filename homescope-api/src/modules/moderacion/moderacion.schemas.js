import { z } from 'zod';

export const MOTIVOS_REPORTE = ['spam', 'ofensivo', 'informacion_falsa', 'datos_personales', 'otro'];
export const ESTADOS_REPORTE = ['pendiente', 'en_revision', 'resuelto', 'descartado'];

// POST /reportes. Por ahora se reportan comentarios de zona (el modelo admite también propiedades y usuarios)
export const crearReporteSchema = z.object({
  tipo_objetivo: z.literal('comentario', {
    errorMap: () => ({ message: 'Por ahora solo se pueden reportar comentarios de zona (tipo_objetivo: comentario)' }),
  }),
  comentario_zona_id: z.coerce.number({ required_error: 'Indica el comentario que reportas' }).int().positive(),
  motivo: z.enum(MOTIVOS_REPORTE, { errorMap: () => ({ message: `Motivos válidos: ${MOTIVOS_REPORTE.join(', ')}` }) }),
  descripcion: z.string()
    .transform((v) => v.replace(/<[^>]*>/g, '').trim())
    .pipe(z.string().max(1000))
    .optional()
    .transform((v) => v || null),
}).refine((r) => r.motivo !== 'otro' || r.descripcion, {
  message: 'Cuéntanos el motivo cuando eliges "otro"', path: ['descripcion'],
});

// GET /admin/reportes?estado=pendiente
export const listarReportesSchema = z.object({
  estado:   z.enum(ESTADOS_REPORTE).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// PUT /admin/reportes/:id
export const resolverReporteSchema = z.object({
  estado: z.enum(['en_revision', 'resuelto', 'descartado'], {
    errorMap: () => ({ message: 'estado debe ser en_revision, resuelto o descartado' }),
  }),
  // Al resolver un reporte de comentario, el administrador puede ocultarlo para todos
  ocultar_comentario: z.boolean().default(false),
}).refine((r) => !r.ocultar_comentario || r.estado === 'resuelto', {
  message: 'Solo se oculta el comentario al resolver el reporte (estado: resuelto)', path: ['ocultar_comentario'],
});

// TODO: gestión de usuarios y verificación de vendedores
export const cambiarEstadoUsuarioSchema = z.object({});
export const resolverVerificacionSchema = z.object({});
