import { z } from 'zod';

const paginacion = {
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
};

// POST /resenas: se califica al vendedor de una propiedad que el comprador contactó o visitó
export const crearResenaSchema = z.object({
  propiedad_id: z.coerce.number({ required_error: 'Indica la propiedad' }).int().positive(),
  calificacion: z.coerce.number({ required_error: 'Indica la calificación', invalid_type_error: 'La calificación debe ser un número del 1 al 5' })
    .int('La calificación debe ser un número entero del 1 al 5')
    .min(1, 'La calificación va del 1 al 5').max(5, 'La calificación va del 1 al 5'),
  // Opcional; se guarda sin etiquetas HTML (arquitectura §12)
  comentario: z.string()
    .transform((v) => v.replace(/<[^>]*>/g, '').trim())
    .pipe(z.string().max(1000, 'El comentario puede tener como máximo 1000 caracteres'))
    .optional()
    .transform((v) => v || null),
});

// GET /resenas/elegibilidad?propiedad_id=45
export const elegibilidadSchema = z.object({
  propiedad_id: z.coerce.number({ required_error: 'Indica la propiedad' }).int().positive(),
});

// GET /vendedores/:id/resenas
export const listarResenasSchema = z.object(paginacion);

// POST /propiedades/:id/comentarios-zona
export const crearComentarioZonaSchema = z.object({
  comentario: z.string({ required_error: 'Escribe tu comentario sobre la zona' })
    .transform((v) => v.replace(/<[^>]*>/g, '').trim())
    .pipe(z.string()
      .min(10, 'Cuéntanos un poco más: al menos 10 caracteres')
      .max(1000, 'El comentario puede tener como máximo 1000 caracteres')),
});

// GET /propiedades/:id/comentarios-zona
export const listarComentariosSchema = z.object(paginacion);
