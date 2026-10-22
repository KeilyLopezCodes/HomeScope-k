import { Router } from 'express';
import { authenticate, requireAdmin, requirePermission } from '../../shared/middleware/auth.js';
import { subirArchivos } from '../../shared/middleware/upload.js';
import { DOCUMENTO_CONFIG } from './moderacion.schemas.js';
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

// ── /verificaciones: el vendedor verifica su identidad para poder publicar ────
export const verificacionesRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Verificación de vendedores
 *   description: |
 *     Un vendedor debe verificar su identidad para publicar: envía una foto o PDF de su documento
 *     (DPI, pasaporte o licencia) y un administrador lo aprueba o lo rechaza. Sin una verificación
 *     aprobada, publicar o reactivar una propiedad responde 403 `VENDEDOR_NO_VERIFICADO`. Los vendedores
 *     verificados muestran la insignia en la ficha y en su perfil. El documento se guarda de forma privada.
 */

/**
 * @openapi
 * /verificaciones/mia:
 *   get:
 *     tags: [Verificación de vendedores]
 *     summary: Estado de mi verificación
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: "`verificado` y la última solicitud (o null si nunca envió una)."
 *         content:
 *           application/json:
 *             example: { verificado: false, solicitud: { id: 3, estado: rechazada, tipo_documento: dpi, fecha_solicitud: "2026-10-21T15:00:00Z", fecha_revision: "2026-10-21T16:00:00Z", motivo_rechazo: "La foto está borrosa." } }
 */
verificacionesRouter.get('/mia', authenticate, controller.getMiVerificacion);

/**
 * @openapi
 * /verificaciones:
 *   post:
 *     tags: [Verificación de vendedores]
 *     summary: Enviar mi documento de identidad (solo vendedores)
 *     description: Una sola solicitud pendiente a la vez. JPG, PNG, WEBP o PDF de hasta 5 MB en el campo `documento`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [tipo_documento, documento]
 *             properties:
 *               tipo_documento: { type: string, enum: [dpi, pasaporte, licencia] }
 *               documento:      { type: string, format: binary }
 *     responses:
 *       201: { description: "Solicitud recibida (estado pendiente)." }
 *       403: { description: El usuario no es vendedor. }
 *       409: { description: "YA_VERIFICADO o SOLICITUD_PENDIENTE." }
 *       413: { description: El archivo pesa más de 5 MB. }
 *       422: { description: "Falta el archivo, tipo de documento inválido o formato no permitido." }
 */
verificacionesRouter.post('/', authenticate,
  subirArchivos('documento', { maxArchivos: 1, maxBytes: DOCUMENTO_CONFIG.maxBytes, tipos: DOCUMENTO_CONFIG.tipos }),
  controller.solicitarVerificacion);

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
 *       Con `pausadas_por_moderacion=true`, las que moderación pausó y aún no aprueba (sus reportes ya están
 *       resueltos, por eso no salen como reportadas). Cada una trae `pausada_por_moderacion`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: reportadas, schema: { type: boolean, default: true } }
 *       - { in: query, name: pausadas_por_moderacion, schema: { type: boolean, default: false } }
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

/**
 * @openapi
 * /admin/estadisticas:
 *   get:
 *     tags: [Moderación]
 *     summary: Estadísticas generales de la plataforma (solo administrador)
 *     description: |
 *       Totales actuales y actividad de los últimos `dias` días (hora de Guatemala): usuarios (por estado y rol,
 *       nuevos), publicaciones (por estado, nuevas publicaciones), actividad (vistas, favoritos, mensajes,
 *       conversaciones, visitas solicitadas, reseñas y calificación promedio), moderación (reportes abiertos
 *       por tipo, acciones del período) y `serie` por día con usuarios nuevos, publicaciones nuevas, vistas y mensajes.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: dias, schema: { type: integer, enum: [7, 30, 90], default: 30 } }
 *     responses:
 *       200:
 *         description: Estadísticas.
 *         content:
 *           application/json:
 *             example:
 *               periodo: { dias: 30, desde: "2026-09-22", hasta: "2026-10-21" }
 *               usuarios: { total: 39, nuevos: 27, por_estado: { activo: 38, suspendido: 1 }, por_rol: { comprador: 30, vendedor: 6, administrador: 1 } }
 *               propiedades: { total: 81, publicadas: 36, nuevas_publicaciones: 12, por_estado: { publicado: 36, borrador: 5, pausado: 4 } }
 *               actividad: { vistas: 2130, favoritos: 44, mensajes: 73, conversaciones: 30, visitas_solicitadas: 8, resenas: 5, calificacion_promedio: 4.1 }
 *               moderacion: { reportes_abiertos: 13, reportes_por_tipo: { propiedad: 7, usuario: 3, comentario: 3 }, acciones: 3, acciones_por_tipo: { pausar: 1 } }
 *               serie: [{ fecha: "2026-10-21", usuarios_nuevos: 0, publicaciones_nuevas: 1, vistas: 77, mensajes: 2 }]
 *       403: { description: El usuario no es administrador. }
 *       422: { description: Período inválido. }
 */
router.get('/estadisticas', controller.getEstadisticas);

/**
 * @openapi
 * /admin/verificaciones:
 *   get:
 *     tags: [Verificación de vendedores]
 *     summary: Solicitudes de verificación de identidad (solo administrador)
 *     description: Las pendientes salen de la más antigua a la más reciente (orden de atención).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: estado, schema: { type: string, enum: [pendiente, aprobada, rechazada] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200: { description: "{ data: [{ id, estado, tipo_documento, fecha_solicitud, usuario, revisor, motivo_rechazo, documento }], total, page, pageSize }" }
 *       403: { description: El usuario no es administrador. }
 */
router.get('/verificaciones', controller.getVerificaciones);

/**
 * @openapi
 * /admin/verificaciones/{id}/documento:
 *   get:
 *     tags: [Verificación de vendedores]
 *     summary: Ver el documento de identidad enviado (solo administrador)
 *     description: Responde el archivo (imagen o PDF). Los documentos están en almacenamiento privado y solo se leen por aquí.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: El archivo.
 *         content:
 *           image/jpeg: {}
 *           image/png: {}
 *           application/pdf: {}
 *       403: { description: El usuario no es administrador. }
 *       404: { description: La solicitud o el archivo no existen. }
 */
router.get('/verificaciones/:id/documento', controller.getDocumentoVerificacion);

/**
 * @openapi
 * /admin/verificaciones/{id}:
 *   put:
 *     tags: [Verificación de vendedores]
 *     summary: Aprobar o rechazar una solicitud (solo administrador)
 *     description: |
 *       Al aprobarla el vendedor puede publicar y su perfil muestra la insignia de vendedor verificado.
 *       Al rechazarla el motivo es obligatorio; el vendedor puede enviar otra solicitud. En ambos casos recibe una notificación.
 *       Quién la revisó y cuándo queda en la solicitud.
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
 *               estado:         { type: string, enum: [aprobada, rechazada] }
 *               motivo_rechazo: { type: string, maxLength: 300, example: "La foto del documento está borrosa." }
 *     responses:
 *       200: { description: La solicitud revisada. }
 *       403: { description: El usuario no es administrador. }
 *       404: { description: La solicitud no existe. }
 *       409: { description: "YA_REVISADA — otro administrador ya la revisó." }
 *       422: { description: "Datos inválidos (rechazo sin motivo) u OBJETIVO_PROPIO." }
 */
router.put('/verificaciones/:id', controller.resolverVerificacion);

export default router;
