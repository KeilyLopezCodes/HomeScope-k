import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './agenda.controller.js';

// El módulo agenda expone tres recursos: la disponibilidad del vendedor, los horarios libres
// de una propiedad y las visitas. Se montan en app.js con su propia ruta.

/**
 * @openapi
 * tags:
 *   name: Visitas
 *   description: |
 *     Disponibilidad del vendedor, horarios libres y visitas. Todas las horas son de Guatemala
 *     (America/Guatemala, UTC-6) y cada visita dura 60 minutos.
 *
 *     Estados de una visita: `solicitada` (la pidió el comprador) → `confirmada` (el vendedor la aceptó)
 *     o `reprogramada` (el vendedor la movió a otro horario); cualquiera de los dos puede pasarla a `cancelada`.
 *     24 horas antes de una visita confirmada o reprogramada, los dos reciben un recordatorio por correo
 *     y como notificación.
 */

// ── /disponibilidad ──────────────────────────────────────────────────────────
export const disponibilidadRouter = Router();

/**
 * @openapi
 * /disponibilidad:
 *   get:
 *     tags: [Visitas]
 *     summary: Mi disponibilidad semanal para recibir visitas (vendedor)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Franjas semanales.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 franjas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:          { type: integer }
 *                       dia_semana:  { type: integer, minimum: 1, maximum: 7, description: "1 = lunes … 7 = domingo" }
 *                       dia:         { type: string, example: lunes }
 *                       hora_inicio: { type: string, example: "09:00" }
 *                       hora_fin:    { type: string, example: "12:00" }
 *                 zona_horaria:        { type: string, example: America/Guatemala }
 *                 duracion_visita_min: { type: integer, example: 60 }
 *   put:
 *     tags: [Visitas]
 *     summary: Declarar mi disponibilidad semanal (reemplaza la anterior)
 *     description: |
 *       Se envían todas las franjas de la semana; las que ya existían se reemplazan. Una lista vacía
 *       deja al vendedor sin horarios. Cada franja dura al menos 60 minutos y no puede encimarse con otra
 *       del mismo día. Las visitas ya solicitadas no se cancelan al cambiar la disponibilidad.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [franjas]
 *             properties:
 *               franjas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [dia_semana, hora_inicio, hora_fin]
 *                   properties:
 *                     dia_semana:  { type: integer, minimum: 1, maximum: 7 }
 *                     hora_inicio: { type: string, example: "09:00" }
 *                     hora_fin:    { type: string, example: "12:00" }
 *           example:
 *             franjas:
 *               - { dia_semana: 1, hora_inicio: "09:00", hora_fin: "12:00" }
 *               - { dia_semana: 3, hora_inicio: "14:00", hora_fin: "17:00" }
 *               - { dia_semana: 6, hora_inicio: "10:00", hora_fin: "13:00" }
 *     responses:
 *       200: { description: Disponibilidad guardada (misma forma que el GET). }
 *       403: { description: El usuario no es vendedor. }
 *       422: { description: Franjas inválidas, demasiado cortas o encimadas. }
 */
disponibilidadRouter.get('/', authenticate, controller.getDisponibilidad);
disponibilidadRouter.put('/', authenticate, requirePermission('disponibilidad.gestionar'), controller.setDisponibilidad);

// ── /propiedades/:id/horarios ────────────────────────────────────────────────
export const horariosRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /propiedades/{id}/horarios:
 *   get:
 *     tags: [Visitas]
 *     summary: Horarios libres para visitar una propiedad
 *     description: |
 *       Bloques de 60 minutos dentro de la disponibilidad del vendedor, sin los ya tomados por otras visitas
 *       (de cualquiera de sus propiedades), desde 2 horas después de ahora. Solo propiedades publicadas.
 *       `fecha_hora` es el valor que se envía en `POST /visitas`.
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: dias, description: "Cuántos días hacia adelante (1–30)", schema: { type: integer, default: 14 } }
 *     responses:
 *       200:
 *         description: Días con horarios libres.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendedor_tiene_disponibilidad: { type: boolean, description: "false = el vendedor no declaró horarios" }
 *                 dias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fecha: { type: string, example: "2026-10-21" }
 *                       dia:   { type: string, example: miércoles }
 *                       horarios:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             fecha_hora: { type: string, format: date-time, example: "2026-10-21T20:00:00.000Z" }
 *                             hora:       { type: string, example: "14:00" }
 *       404: { description: La propiedad no existe o no está publicada. }
 */
horariosRouter.get('/', controller.getHorarios);

// ── /visitas ─────────────────────────────────────────────────────────────────
export const visitasRouter = Router();

/**
 * @openapi
 * /visitas:
 *   get:
 *     tags: [Visitas]
 *     summary: Mis visitas (como comprador o como vendedor)
 *     description: Cada visita indica mi `rol`, con quién es (`contraparte`, solo nombre) y qué `acciones` puedo hacer.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: rol, schema: { type: string, enum: [comprador, vendedor] } }
 *       - { in: query, name: estado, schema: { type: string, enum: [solicitada, confirmada, reprogramada, cancelada] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200: { description: Página de visitas. }
 *   post:
 *     tags: [Visitas]
 *     summary: Solicitar una visita en un horario disponible (comprador)
 *     description: |
 *       `fecha_hora` debe ser uno de los horarios de `GET /propiedades/{id}/horarios`. Si otra persona lo tomó
 *       antes, responde 409. El vendedor recibe una notificación.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propiedad_id, fecha_hora]
 *             properties:
 *               propiedad_id: { type: integer, example: 45 }
 *               fecha_hora:   { type: string, format: date-time, example: "2026-10-21T14:00:00-06:00" }
 *               nota:         { type: string, maxLength: 300, example: "Llegaré con mi pareja." }
 *     responses:
 *       201: { description: Visita solicitada (estado solicitada). }
 *       404: { description: La propiedad no existe o no está publicada. }
 *       409: { description: "Horario ya tomado (HORARIO_OCUPADO) o ya tienes una visita activa en esa propiedad (VISITA_ACTIVA)." }
 *       422: { description: "Horario fuera de la disponibilidad (HORARIO_NO_DISPONIBLE), fuera de rango o propiedad propia." }
 */
visitasRouter.get('/', authenticate, requirePermission('visita.ver_propias'), controller.getVisitas);
visitasRouter.post('/', authenticate, requirePermission('visita.solicitar'), controller.solicitarVisita);

/**
 * @openapi
 * /visitas/{id}:
 *   get:
 *     tags: [Visitas]
 *     summary: Detalle de una visita (solo participantes)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Visita. }
 *       404: { description: La visita no existe o el usuario no participa en ella. }
 *   patch:
 *     tags: [Visitas]
 *     summary: Confirmar, reprogramar o cancelar una visita
 *     description: |
 *       - `{ "estado": "confirmada" }` — el vendedor acepta el horario pedido.
 *       - `{ "estado": "reprogramada", "fecha_hora": "…" }` — el vendedor la mueve a otro horario libre de su disponibilidad.
 *       - `{ "estado": "cancelada" }` — cualquiera de los dos.
 *       La otra persona recibe una notificación. No se pueden cambiar visitas canceladas ni pasadas.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:     { type: string, enum: [confirmada, reprogramada, cancelada] }
 *               fecha_hora: { type: string, format: date-time, description: "Solo para reprogramada" }
 *     responses:
 *       200: { description: Visita actualizada. }
 *       403: { description: Solo el vendedor puede confirmar o reprogramar. }
 *       404: { description: La visita no existe o el usuario no participa en ella. }
 *       409: { description: El nuevo horario ya está ocupado. }
 *       422: { description: Transición no permitida, visita pasada o cancelada, u horario no disponible. }
 */
visitasRouter.get('/:id', authenticate, controller.getVisita);
visitasRouter.patch('/:id', authenticate, controller.actualizarVisita);
