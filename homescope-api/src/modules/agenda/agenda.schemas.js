import { z } from 'zod';
import { DURACION_VISITA_MIN, DIAS_MAXIMOS, aMinutos } from './agenda.tiempo.js';

export const ESTADOS_VISITA = ['solicitada', 'confirmada', 'reprogramada', 'cancelada'];
// Visitas que ocupan un horario del vendedor
export const ESTADOS_ACTIVOS = ['solicitada', 'confirmada', 'reprogramada'];

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa el formato HH:MM de 24 horas (por ejemplo 09:00)');

const franja = z.object({
  dia_semana:  z.coerce.number().int().min(1, '1 = lunes … 7 = domingo').max(7, '1 = lunes … 7 = domingo'),
  hora_inicio: hora,
  hora_fin:    hora,
}).refine((f) => aMinutos(f.hora_fin) - aMinutos(f.hora_inicio) >= DURACION_VISITA_MIN, {
  message: `Cada franja debe durar al menos ${DURACION_VISITA_MIN} minutos (lo que dura una visita)`,
  path: ['hora_fin'],
});

// PUT /disponibilidad: reemplaza todas las franjas semanales del vendedor (una lista vacía = sin disponibilidad)
export const disponibilidadSchema = z.object({
  franjas: z.array(franja, { required_error: 'Envía la lista de franjas (puede ser vacía)' }).max(50),
}).superRefine(({ franjas }, ctx) => {
  // Dos franjas del mismo día no se pueden encimar
  franjas.forEach((a, i) => franjas.slice(i + 1).forEach((b, j) => {
    if (a.dia_semana === b.dia_semana
      && aMinutos(a.hora_inicio) < aMinutos(b.hora_fin) && aMinutos(b.hora_inicio) < aMinutos(a.hora_fin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['franjas', i + j + 1],
        message: `Se encima con otra franja del mismo día (${a.hora_inicio}–${a.hora_fin})`,
      });
    }
  }));
});

// GET /propiedades/:id/horarios?dias=14
export const horariosSchema = z.object({
  dias: z.coerce.number().int().min(1).max(DIAS_MAXIMOS).default(14),
});

// Fecha y hora ISO 8601 con zona: "2026-10-20T09:00:00-06:00" o "2026-10-20T15:00:00Z"
const fechaHora = z.string({ required_error: 'Indica la fecha y hora de la visita' })
  .datetime({ offset: true, message: 'Usa fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-10-20T09:00:00-06:00' })
  .transform((v) => new Date(v));

// POST /visitas
export const solicitarVisitaSchema = z.object({
  propiedad_id: z.coerce.number({ required_error: 'Indica la propiedad' }).int().positive(),
  fecha_hora:   fechaHora,
  nota:         z.string().transform((v) => v.replace(/<[^>]*>/g, '').trim()).pipe(z.string().max(300)).optional(),
});

// PATCH /visitas/:id: confirmar, reprogramar (con la nueva fecha) o cancelar
export const actualizarVisitaSchema = z.discriminatedUnion('estado', [
  z.object({ estado: z.literal('confirmada') }),
  z.object({ estado: z.literal('reprogramada'), fecha_hora: fechaHora }),
  z.object({ estado: z.literal('cancelada') }),
], { errorMap: () => ({ message: 'estado debe ser confirmada, reprogramada (con fecha_hora) o cancelada' }) });

// GET /visitas?rol=vendedor&estado=solicitada
export const listarVisitasSchema = z.object({
  rol:      z.enum(['comprador', 'vendedor']).optional(),
  estado:   z.enum(ESTADOS_VISITA).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
