import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './comunicacion.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Notificaciones
 *   description: Bandeja de notificaciones del usuario autenticado (mensajes nuevos, y más adelante visitas y reseñas)
 */

/**
 * @openapi
 * /notificaciones:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Mis notificaciones (paginadas)
 *     description: La más reciente primero. `no_leidas` cuenta todas las no leídas, aunque se filtre la página.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: leida, description: "false = solo las no leídas", schema: { type: string, enum: ["true", "false"] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1, minimum: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, minimum: 1, maximum: 50 } }
 *     responses:
 *       200:
 *         description: Página de notificaciones.
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
 *                       id:              { type: integer }
 *                       tipo:            { type: string, example: mensaje }
 *                       titulo:          { type: string, example: "Nuevo mensaje sobre \"Casa familiar #1\"" }
 *                       contenido:       { type: string, example: "Ana: Hola, ¿la casa sigue disponible?" }
 *                       referencia_tipo: { type: string, nullable: true, example: conversacion }
 *                       referencia_id:   { type: integer, nullable: true, description: "Id de la conversación" }
 *                       leida:           { type: boolean }
 *                       fecha_creacion:  { type: string, format: date-time }
 *                 total:     { type: integer }
 *                 no_leidas: { type: integer }
 *                 page:      { type: integer }
 *                 pageSize:  { type: integer }
 */
router.get('/', authenticate, requirePermission('notificacion.ver_propias'), controller.listarNotificaciones);

/**
 * @openapi
 * /notificaciones/{id}:
 *   patch:
 *     tags: [Notificaciones]
 *     summary: Marcar una notificación como leída o no leída
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [leida], properties: { leida: { type: boolean } } }
 *     responses:
 *       200: { description: Notificación actualizada. }
 *       404: { description: La notificación no existe o es de otro usuario. }
 */
router.patch('/:id', authenticate, requirePermission('notificacion.ver_propias'), controller.actualizarNotificacion);

export default router;
