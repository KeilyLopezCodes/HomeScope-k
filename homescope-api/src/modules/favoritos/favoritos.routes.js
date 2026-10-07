import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './favoritos.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Favoritos
 *   description: Historial — propiedades guardadas por el comprador
 */

/**
 * @openapi
 * /favoritos:
 *   get:
 *     tags: [Favoritos]
 *     summary: Historial — propiedades guardadas por el comprador autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de propiedades guardadas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:           { type: integer }
 *                   titulo:       { type: string }
 *                   direccion:    { type: string }
 *                   precio:       { type: number }
 *                   moneda:       { type: string }
 *                   modalidad:    { type: string }
 *                   guardado_en:  { type: string, format: date-time }
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/', authenticate, controller.listar);

/**
 * @openapi
 * /favoritos/{propiedadId}:
 *   post:
 *     tags: [Favoritos]
 *     summary: Guardar una propiedad en favoritos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propiedadId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Propiedad guardada.
 *       409:
 *         description: La propiedad ya está en favoritos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   delete:
 *     tags: [Favoritos]
 *     summary: Eliminar una propiedad de favoritos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propiedadId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Propiedad eliminada de favoritos.
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:propiedadId',   authenticate, controller.agregar);
router.delete('/:propiedadId', authenticate, controller.eliminar);

export default router;
