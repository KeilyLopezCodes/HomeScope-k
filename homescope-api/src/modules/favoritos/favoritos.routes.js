import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './favoritos.controller.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Favoritos
 *   description: |
 *     Propiedades guardadas por el usuario. Se guardan solo publicaciones publicadas y ajenas;
 *     quitar una que no estaba guardada no es error (204).
 */

/**
 * @openapi
 * /favoritos:
 *   get:
 *     tags: [Favoritos]
 *     summary: Propiedades guardadas por el usuario autenticado
 *     description: |
 *       La más reciente primero, con su portada y su Índice de Conveniencia (sin desglose). Las que dejaron
 *       de estar publicadas siguen en la lista con `disponible: false` y su `estado`.
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
 *                   estado:       { type: string, example: publicado }
 *                   disponible:   { type: boolean, description: "false si ya no está publicada" }
 *                   portada:      { type: string, nullable: true }
 *                   habitaciones: { type: integer, nullable: true }
 *                   banos:        { type: number, nullable: true }
 *                   area_m2:      { type: number, nullable: true }
 *                   indice_conveniencia: { type: object, nullable: true, example: { puntaje: 72.5, nivel: verde } }
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
 *       404:
 *         description: La propiedad no existe o no está publicada.
 *       422:
 *         description: "PROPIEDAD_PROPIA — no se guarda una publicación propia."
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
