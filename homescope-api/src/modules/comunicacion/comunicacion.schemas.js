import { z } from 'zod';

// Los mensajes se sanitizan al guardar (arquitectura §12): sin etiquetas HTML ni caracteres de control,
// sin espacios al inicio y al final, y como máximo una línea en blanco seguida
export function sanitizarTexto(texto) {
  return texto
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const contenido = z.string({ required_error: 'Escribe un mensaje' })
  .transform(sanitizarTexto)
  .pipe(z.string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(2000, 'El mensaje puede tener como máximo 2000 caracteres'));

const paginacion = {
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
};

// POST /conversaciones: el comprador abre la conversación sobre una propiedad (con un primer mensaje opcional)
export const crearConversacionSchema = z.object({
  propiedad_id: z.coerce.number({ required_error: 'Indica la propiedad' }).int().positive(),
  mensaje:      contenido.optional(),
});

// POST /conversaciones/:id/mensajes
export const enviarMensajeSchema = z.object({ contenido });

// PATCH /conversaciones/:id → marcar como leídos los mensajes recibidos
export const actualizarConversacionSchema = z.object({
  leida: z.literal(true, { errorMap: () => ({ message: 'Envía { "leida": true } para marcar la conversación como leída' }) }),
});

export const paginaSchema = z.object(paginacion);

// GET /notificaciones?leida=false
export const listarNotificacionesSchema = z.object({
  ...paginacion,
  leida: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

// PATCH /notificaciones/:id
export const actualizarNotificacionSchema = z.object({ leida: z.boolean() });
