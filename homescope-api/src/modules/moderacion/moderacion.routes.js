import { Router } from 'express';
import { authenticate, requireAdmin, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './moderacion.controller.js';

/**
 * @openapi
 * tags:
 *   name: Moderación
 *   description: |
 *     Reportes de contenido y acciones del administrador. Cualquier usuario con sesión reporta un comentario,
 *     una publicación o un usuario en `POST /reportes`. El administrador revisa lo reportado en `/admin/...`
 *     y ejecuta acciones con `POST /admin/acciones`: aprobar, pausar o eliminar una publicación; aprobar,
 *     suspender o reactivar una cuenta. Toda acción queda registrada (`GET /admin/acciones`).
 *
 *     **Todas las rutas `/admin` exigen el rol administrador** (403 `SIN_PERMISO` para cualquier otro rol).
 */

// ── /reportes ────────────────────────────────────────────────────────────────
export const reportesRouter = Router();

/**
 * @openapi
 * /reportes:
 *   post:
 *     tags: [Moderación]
 *     summary: Reportar un comentario de zona, una publicación o un usuario
 *     description: |
 *       Según `tipo_objetivo` se envía `comentario_zona_id`, `propiedad_id` (publicada) o `usuario_reportado_id`.
 *       Motivos: `spam`, `ofensivo`, `informacion_falsa`, `datos_personales`, `fraude` u `otro` (con `otro`, la descripción es obligatoria).
 *       Un usuario no puede reportar dos veces lo mismo mientras su reporte siga abierto, ni reportarse a sí mismo o a lo suyo.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo_objetivo, motivo]
 *             properties:
 *               tipo_objetivo:        { type: string, enum: [comentario, propiedad, usuario] }
 *               comentario_zona_id:   { type: integer, example: 1 }
 *               propiedad_id:         { type: integer, example: 53 }
 *               usuario_reportado_id: { type: integer, example: 11 }
 *               motivo:               { type: string, enum: [spam, ofensivo, informacion_falsa, datos_personales, fraude, otro] }
 *               descripcion:          { type: string, maxLength: 1000, example: "Las fotos son de otra casa." }
 *           examples:
 *             publicacion: { value: { tipo_objetivo: propiedad, propiedad_id: 53, motivo: informacion_falsa, descripcion: "Las fotos son de otra casa." } }
 *             usuario:     { value: { tipo_objetivo: usuario, usuario_reportado_id: 11, motivo: fraude, descripcion: "Pidió un depósito antes de la visita." } }
 *             comentario:  { value: { tipo_objetivo: comentario, comentario_zona_id: 1, motivo: ofensivo } }
 *     responses:
 *       201: { description: "Reporte recibido (estado pendiente)." }
 *       404: { description: "El objetivo no existe (o el comentario está oculto, o la publicación no está publicada)." }
 *       409: { description: "YA_REPORTADO — ya hay un reporte abierto de este usuario sobre lo mismo." }
 *       422: { description: "Datos inválidos u OBJETIVO_PROPIO." }
 */
reportesRouter.post('/', authenticate, requirePermission('reporte.crear'), controller.crearReporte);

// ── /admin: solo administrador ───────────────────────────────────────────────
const router = Router();
router.use(authenticate, requireAdmin);

/**
 * @openapi
 * /admin/reportes:
 *   get:
 *     tags: [Moderación]
 *     summary: Cola de reportes (solo administrador)
 *     description: |
 *       Cada reporte trae su objetivo (`comentario`, `propiedad` o `usuario`) con cuántos reportes abiertos tiene.
 *       `abiertos` cuenta los pendientes y en revisión. Los abiertos salen del más antiguo al más reciente (orden de atención).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: estado, schema: { type: string, enum: [pendiente, en_revision, resuelto, descartado] } }
 *       - { in: query, name: tipo, schema: { type: string, enum: [comentario, propiedad, usuario] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200: { description: "{ data, total, abiertos, page, pageSize }" }
 *       403: { description: El usuario no es administrador. }
 */
router.get('/reportes', controller.getReportes);

/**
 * @openapi
 * /admin/reportes/{id}:
 *   put:
 *     tags: [Moderación]
 *     summary: Atender un reporte (solo administrador)
 *     description: |
 *       Cambia el estado del reporte. Con `estado: resuelto` y `ocultar_comentario: true`, el comentario deja de
 *       mostrarse a todos y los demás reportes abiertos sobre él también quedan resueltos.
 *       Resolver o descartar queda registrado como acción (`ocultar_comentario` o `descartar_reporte`) con el `motivo` indicado.
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
 *               motivo:             { type: string, maxLength: 300 }
 *     responses:
 *       200: { description: Reporte actualizado. }
 *       403: { description: El usuario no es administrador. }
 *       404: { description: El reporte no existe. }
 */
router.put('/reportes/:id', controller.resolverReporte);

/**
 * @openapi
 * /admin/propiedades:
 *   get:
 *     tags: [Moderación]
 *     summary: Publicaciones reportadas (solo administrador)
 *     description: |
 *       Con `reportadas=true` (por defecto) solo las que tienen reportes abiertos, las más reportadas primero, con
 *       `reportes_abiertos`, `motivos` (cuántos por motivo), `ultimo_reporte` y los reportes. Con `reportadas=false`, todas.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: reportadas, schema: { type: boolean, default: true } }
 *       - { in: query, name: estado, schema: { type: string, enum: [borrador, publicado, pausado, vendido, alquilado] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200: { description: "{ data, total, page, pageSize }" }
 *       403: { description: El usuario no es administrador. }
 */
router.get('/propiedades', controller.getPropiedades);

/**
 * @openapi
 * /admin/usuarios:
 *   get:
 *     tags: [Moderación]
 *     summary: Usuarios, con filtro de reportados (solo administrador)
 *     description: |
 *       Con `reportados=true` solo los que tienen reportes abiertos, los más reportados primero. Se puede filtrar
 *       por `estado` (p. ej. `suspendido`) y buscar por nombre o correo con `q`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: reportados, schema: { type: boolean, default: false } }
 *       - { in: query, name: estado, schema: { type: string, enum: [pendiente, activo, suspendido, inhabilitado] } }
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200: { description: "{ data, total, page, pageSize }" }
 *       403: { description: El usuario no es administrador. }
 */
router.get('/usuarios', controller.getUsuarios);

/**
 * @openapi
 * /admin/acciones:
 *   post:
 *     tags: [Moderación]
 *     summary: Ejecutar una acción de moderación (solo administrador)
 *     description: |
 *       Ejecuta la acción y la registra en la misma transacción (quién, cuándo, sobre qué y por qué).
 *
 *       **Sobre una publicación** (`propiedad_id`):
 *       - `aprobar`: descarta sus reportes abiertos; si estaba pausada por moderación, la vuelve a publicar.
 *       - `pausar`: deja de verse en el catálogo y sus reportes quedan resueltos. El dueño no puede reactivarla hasta que se apruebe.
 *       - `eliminar`: la borra con sus fotos. El registro conserva una copia de su título y dueño.
 *
 *       **Sobre una cuenta** (`usuario_id`):
 *       - `aprobar`: descarta los reportes abiertos contra el usuario.
 *       - `suspender`: pierde el acceso de inmediato (aunque tenga un token vigente), se cierran sus sesiones y
 *         sus publicaciones se pausan. No se puede suspender a un administrador ni a uno mismo.
 *       - `reactivar`: recupera el acceso y vuelven a publicarse las publicaciones que pausó la suspensión.
 *
 *       El afectado recibe una notificación. `reporte_id` (opcional) vincula la acción con el reporte que la motivó.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accion, motivo]
 *             properties:
 *               accion:       { type: string, enum: [aprobar, pausar, eliminar, suspender, reactivar] }
 *               propiedad_id: { type: integer }
 *               usuario_id:   { type: integer }
 *               motivo:       { type: string, minLength: 5, maxLength: 300 }
 *               reporte_id:   { type: integer }
 *           examples:
 *             pausar:    { value: { accion: pausar, propiedad_id: 53, motivo: "Las fotos no corresponden a la propiedad." } }
 *             suspender: { value: { accion: suspender, usuario_id: 12, motivo: "Varios reportes de fraude confirmados." } }
 *     responses:
 *       201: { description: "La acción registrada: { id, accion, motivo, fecha_accion, administrador, propiedad, usuario, detalle }" }
 *       403: { description: "El usuario no es administrador, o se intenta suspender a un administrador." }
 *       404: { description: La publicación, el usuario o el reporte no existen. }
 *       422: { description: "Datos inválidos, ESTADO_INVALIDO (p. ej. pausar una no publicada), NADA_QUE_APROBAR o REPORTE_NO_CORRESPONDE." }
 *   get:
 *     tags: [Moderación]
 *     summary: Registro de acciones de moderación (solo administrador)
 *     description: Lo más reciente primero. Filtrable por publicación, usuario, administrador o tipo de acción.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: propiedad_id, schema: { type: integer } }
 *       - { in: query, name: usuario_id, schema: { type: integer } }
 *       - { in: query, name: administrador_id, schema: { type: integer } }
 *       - { in: query, name: accion, schema: { type: string, enum: [aprobar, pausar, eliminar, suspender, reactivar, ocultar_comentario, descartar_reporte] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200: { description: "{ data, total, page, pageSize }" }
 *       403: { description: El usuario no es administrador. }
 */
router.post('/acciones', controller.crearAccion);
router.get('/acciones', controller.getAcciones);

router.get('/verificaciones', controller.getVerificaciones);
router.put('/verificaciones/:id', controller.resolverVerificacion);

export default router;
