import { Router } from 'express';
import { authenticate, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './moderacion.controller.js';

/**
 * @openapi
 * tags:
 *   name: Moderación
 *   description: |
 *     Reportes de contenido. Cualquier usuario con sesión reporta en `POST /reportes`; el administrador
 *     los ve y atiende en `/admin/reportes`. Un comentario reportado sigue visible hasta que el
 *     administrador lo oculte.
 */

// ── /reportes ────────────────────────────────────────────────────────────────
export const reportesRouter = Router();

/**
 * @openapi
 * /reportes:
 *   post:
 *     tags: [Moderación]
 *     summary: Reportar un comentario de zona
 *     description: |
 *       Motivos: `spam`, `ofensivo`, `informacion_falsa`, `datos_personales` u `otro` (con `otro`, la descripción es obligatoria).
 *       Un mismo usuario no puede reportar dos veces el mismo comentario mientras el reporte siga abierto, ni su propio comentario.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo_objetivo, comentario_zona_id, motivo]
 *             properties:
 *               tipo_objetivo:      { type: string, enum: [comentario] }
 *               comentario_zona_id: { type: integer, example: 1 }
 *               motivo:             { type: string, enum: [spam, ofensivo, informacion_falsa, datos_personales, otro] }
 *               descripcion:        { type: string, maxLength: 1000, example: "Incluye el número de teléfono de un vecino." }
 *     responses:
 *       201: { description: "Reporte recibido (estado pendiente)." }
 *       404: { description: El comentario no existe o ya está oculto. }
 *       409: { description: "YA_REPORTADO — ya hay un reporte abierto de este usuario sobre ese comentario." }
 *       422: { description: "Datos inválidos o COMENTARIO_PROPIO." }
 */
reportesRouter.post('/', authenticate, requirePermission('reporte.crear'), controller.crearReporte);

// ── /admin ───────────────────────────────────────────────────────────────────
const router = Router();

router.get('/usuarios', authenticate, requirePermission('admin.usuarios.ver'), controller.getUsuarios);
router.put('/usuarios/:id/estado', authenticate, requirePermission('admin.usuarios.gestionar'), controller.cambiarEstadoUsuario);

/**
 * @openapi
 * /admin/reportes:
 *   get:
 *     tags: [Moderación]
 *     summary: Cola de reportes (solo administrador)
 *     description: |
 *       Incluye el comentario reportado (aunque ya esté oculto), su autor, la propiedad y cuántos reportes
 *       abiertos tiene. `abiertos` cuenta todos los pendientes y en revisión. Los abiertos salen del más
 *       antiguo al más reciente (orden de atención).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: estado, schema: { type: string, enum: [pendiente, en_revision, resuelto, descartado] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200: { description: "{ data, total, abiertos, page, pageSize }" }
 *       403: { description: El usuario no es administrador. }
 */
router.get('/reportes', authenticate, requirePermission('admin.reportes.ver'), controller.getReportes);

/**
 * @openapi
 * /admin/reportes/{id}:
 *   put:
 *     tags: [Moderación]
 *     summary: Atender un reporte (solo administrador)
 *     description: |
 *       Cambia el estado del reporte. Con `estado: resuelto` y `ocultar_comentario: true`, el comentario deja de
 *       mostrarse a todos y los demás reportes abiertos sobre él también quedan resueltos.
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
 *               estado:             { type: string, enum: [en_revision, resuelto, descartado] }
 *               ocultar_comentario: { type: boolean, default: false }
 *     responses:
 *       200: { description: Reporte actualizado. }
 *       403: { description: El usuario no es administrador. }
 *       404: { description: El reporte no existe. }
 */
router.put('/reportes/:id', authenticate, requirePermission('admin.reportes.gestionar'), controller.resolverReporte);

router.get('/verificaciones', authenticate, requirePermission('admin.verificaciones.ver'), controller.getVerificaciones);
router.put('/verificaciones/:id', authenticate, requirePermission('admin.verificaciones.gestionar'), controller.resolverVerificacion);

export default router;
