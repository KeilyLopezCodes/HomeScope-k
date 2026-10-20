import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './comunicacion.controller.js';

const router = Router();

// RNF-07: límite de mensajes por usuario (no por IP), para frenar el spam
const limiteMensajes = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `usuario:${req.user.sub}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'DEMASIADAS_SOLICITUDES', message: 'Estás enviando mensajes muy rápido. Espera un minuto.', details: [] } },
});

/**
 * @openapi
 * tags:
 *   name: Mensajería
 *   description: |
 *     Conversaciones entre comprador y vendedor sobre una propiedad. Los participantes solo ven el
 *     nombre del otro, nunca su correo ni su teléfono (RNF-08).
 *
 *     **Tiempo real (Socket.io):** conectarse a la URL de la API con `io(API_URL, { auth: { token } })`
 *     usando el access token. Eventos que recibe cada usuario en su sala:
 *     - `mensaje:nuevo` — un mensaje de una conversación en la que participa (mismo formato que `POST /conversaciones/{id}/mensajes`)
 *     - `notificacion:nueva` — una notificación nueva o actualizada (mismo formato que `GET /notificaciones`)
 */

/**
 * @openapi
 * /conversaciones:
 *   get:
 *     tags: [Mensajería]
 *     summary: Mis conversaciones (como comprador o vendedor)
 *     description: La de actividad más reciente primero, con el último mensaje y cuántos mensajes recibidos faltan por leer.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1, minimum: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, minimum: 1, maximum: 50 } }
 *     responses:
 *       200:
 *         description: Página de conversaciones.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:                { type: integer }
 *                       rol:               { type: string, enum: [comprador, vendedor], description: Mi papel en la conversación }
 *                       propiedad:         { type: object, properties: { id: { type: integer }, titulo: { type: string }, portada: { type: string, nullable: true } } }
 *                       contraparte:       { type: object, properties: { id: { type: integer }, nombre: { type: string } } }
 *                       ultimo_mensaje:    { type: object, nullable: true }
 *                       no_leidos:         { type: integer }
 *                       ultimo_mensaje_en: { type: string, format: date-time, nullable: true }
 *                 total:    { type: integer }
 *                 page:     { type: integer }
 *                 pageSize: { type: integer }
 *   post:
 *     tags: [Mensajería]
 *     summary: Iniciar una conversación sobre una propiedad
 *     description: |
 *       Hay una sola conversación por propiedad y comprador: si ya existe, se reutiliza (200) en lugar
 *       de crear otra (201). La propiedad debe estar publicada y no ser del solicitante.
 *       Con `mensaje`, se envía como primer mensaje y el vendedor recibe la notificación.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propiedad_id]
 *             properties:
 *               propiedad_id: { type: integer, example: 45 }
 *               mensaje:      { type: string, maxLength: 2000, example: "Hola, ¿la casa sigue disponible?" }
 *     responses:
 *       201: { description: Conversación creada. }
 *       200: { description: La conversación ya existía y se reutilizó. }
 *       404: { description: La propiedad no existe o no está publicada. }
 *       422: { description: Datos inválidos o la propiedad es del solicitante (PROPIEDAD_PROPIA). }
 *       429: { description: Demasiados mensajes en un minuto. }
 */
router.get('/', authenticate, controller.listar);
router.post('/', authenticate, requirePermission('mensaje.enviar'), limiteMensajes, controller.crear);

/**
 * @openapi
 * /conversaciones/{id}:
 *   patch:
 *     tags: [Mensajería]
 *     summary: Marcar la conversación como leída
 *     description: Marca como leídos los mensajes que el usuario recibió en ella y sus notificaciones.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [leida], properties: { leida: { type: boolean, enum: [true] } } }
 *     responses:
 *       200: { description: "Cuántos mensajes se marcaron: { conversacion_id, mensajes_marcados }" }
 *       404: { description: La conversación no existe o el usuario no participa en ella. }
 */
router.patch('/:id', authenticate, controller.actualizar);

/**
 * @openapi
 * /conversaciones/{id}/mensajes:
 *   get:
 *     tags: [Mensajería]
 *     summary: Mensajes de una conversación (paginados)
 *     description: Del más reciente al más antiguo. Solo para los dos participantes; para los demás responde 404.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: page, schema: { type: integer, default: 1, minimum: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, minimum: 1, maximum: 50 } }
 *     responses:
 *       200:
 *         description: Página de mensajes y datos de la conversación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversacion: { type: object }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:          { type: integer }
 *                       remitente:   { type: object, properties: { id: { type: integer }, nombre: { type: string } } }
 *                       es_mio:      { type: boolean }
 *                       contenido:   { type: string }
 *                       fecha_envio: { type: string, format: date-time }
 *                       leido_en:    { type: string, format: date-time, nullable: true }
 *                 total:    { type: integer }
 *                 page:     { type: integer }
 *                 pageSize: { type: integer }
 *       404: { description: La conversación no existe o el usuario no participa en ella. }
 *   post:
 *     tags: [Mensajería]
 *     summary: Enviar un mensaje
 *     description: |
 *       Guarda el mensaje (sin etiquetas HTML), crea o actualiza la notificación del destinatario y emite
 *       `mensaje:nuevo` y `notificacion:nueva` por Socket.io. Mientras el destinatario no lea la conversación,
 *       sus mensajes nuevos actualizan una sola notificación en lugar de crear una por mensaje.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contenido]
 *             properties:
 *               contenido: { type: string, minLength: 1, maxLength: 2000, example: "¿Puedo visitarla el sábado?" }
 *     responses:
 *       201: { description: Mensaje enviado. }
 *       404: { description: La conversación no existe o el usuario no participa en ella. }
 *       422: { description: Mensaje vacío o de más de 2000 caracteres. }
 *       429: { description: Demasiados mensajes en un minuto. }
 */
router.get('/:id/mensajes', authenticate, controller.getMensajes);
router.post('/:id/mensajes', authenticate, requirePermission('mensaje.enviar'), limiteMensajes, controller.enviarMensaje);

export default router;
