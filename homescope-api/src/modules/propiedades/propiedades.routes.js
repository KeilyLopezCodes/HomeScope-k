import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { authenticate, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './propiedades.controller.js';

const router = Router();

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET); } catch { /* ignorar */ }
  }
  next();
}

/**
 * @openapi
 * tags:
 *   name: Propiedades
 *   description: Catálogo de propiedades e historial del usuario
 */

/**
 * @openapi
 * /propiedades:
 *   get:
 *     tags: [Propiedades]
 *     summary: Listar propiedades publicadas
 *     description: Catálogo público. No incluye email ni teléfono del vendedor.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *     responses:
 *       200:
 *         description: Lista de propiedades.
 */
router.get('/', optionalAuth, controller.listar);

/**
 * @openapi
 * /propiedades/mias:
 *   get:
 *     tags: [Propiedades]
 *     summary: Historial — propiedades publicadas por el vendedor autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de propiedades del vendedor.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:             { type: integer }
 *                   titulo:         { type: string }
 *                   direccion:      { type: string }
 *                   precio:         { type: number }
 *                   moneda:         { type: string, example: GTQ }
 *                   modalidad:      { type: string, example: venta }
 *                   estado:         { type: string, example: publicado }
 *                   fecha_creacion: { type: string, format: date-time }
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/mias', authenticate, controller.listarMias);

/**
 * @openapi
 * /propiedades/vistas:
 *   get:
 *     tags: [Propiedades]
 *     summary: Historial — propiedades vistas por el comprador autenticado
 *     description: Devuelve las propiedades vistas sin duplicados, ordenadas por la vista más reciente.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de propiedades vistas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:          { type: integer }
 *                   titulo:      { type: string }
 *                   precio:      { type: number }
 *                   moneda:      { type: string }
 *                   modalidad:   { type: string }
 *                   fecha_vista: { type: string, format: date-time }
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/vistas', authenticate, controller.listarVistas);

/**
 * @openapi
 * /propiedades/{id}:
 *   get:
 *     tags: [Propiedades]
 *     summary: Detalle de una propiedad
 *     description: |
 *       Devuelve el detalle completo. El `email` y `telefono` del vendedor **solo se incluyen**
 *       si el solicitante autenticado tiene una conversación activa con el vendedor (RNF-08).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detalle de la propiedad.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:          { type: integer }
 *                 titulo:      { type: string }
 *                 descripcion: { type: string }
 *                 precio:      { type: number }
 *                 moneda:      { type: string }
 *                 modalidad:   { type: string }
 *                 vendedor:
 *                   type: object
 *                   properties:
 *                     id:       { type: integer }
 *                     nombre:   { type: string }
 *                     apellido: { type: string }
 *                     email:    { type: string, description: "Solo si existe conversación" }
 *                     telefono: { type: string, description: "Solo si existe conversación" }
 *       404:
 *         description: Propiedad no encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', optionalAuth, controller.getById);

/**
 * @openapi
 * /propiedades/{id}/vista:
 *   post:
 *     tags: [Propiedades]
 *     summary: Registrar vista de una propiedad
 *     description: No registra la vista si el solicitante es el propio vendedor.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               origen:
 *                 type: string
 *                 enum: [catalogo, mapa, busqueda]
 *                 default: catalogo
 *     responses:
 *       204:
 *         description: Vista registrada.
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:id/vista', authenticate, controller.registrarVista);

router.post('/',                    authenticate, requirePermission('propiedad.publicar'), controller.crear);
router.put('/:id',                  authenticate, controller.actualizar);
router.delete('/:id',               authenticate, controller.eliminar);
router.post('/:id/publicar',        authenticate, requirePermission('propiedad.publicar'), controller.publicar);
router.post('/:id/fotos',           authenticate, controller.agregarFoto);
router.delete('/:id/fotos/:fotoId', authenticate, controller.eliminarFoto);

export default router;
