import { Router } from 'express';
import { authenticate, optionalAuth, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './reputacion.controller.js';

// Tres recursos: las reseñas (/resenas), el perfil público de cada vendedor (/vendedores)
// y los comentarios sobre la zona de una propiedad (/propiedades/:id/comentarios-zona)

/**
 * @openapi
 * tags:
 *   name: Reseñas
 *   description: |
 *     Calificación de vendedores (1 a 5) con comentario opcional. Una reseña por comprador y propiedad.
 *     Solo puede calificar quien tuvo contacto real con la propiedad: le escribió al vendedor en la
 *     conversación de esa propiedad, o tuvo una visita confirmada que ya ocurrió.
 */

export const resenasRouter = Router();

/**
 * @openapi
 * /resenas:
 *   post:
 *     tags: [Reseñas]
 *     summary: Calificar al vendedor de una propiedad
 *     description: El vendedor se toma de la propiedad y recibe una notificación.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propiedad_id, calificacion]
 *             properties:
 *               propiedad_id: { type: integer, example: 50 }
 *               calificacion: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               comentario:   { type: string, maxLength: 1000, example: "Muy puntual y respondió todas mis dudas." }
 *     responses:
 *       201: { description: Reseña creada. }
 *       403: { description: "SIN_CONTACTO_NI_VISITA — el comprador no escribió por esta propiedad ni la visitó." }
 *       404: { description: La propiedad no existe. }
 *       409: { description: "YA_RESENADA — ya calificó al vendedor por esta propiedad." }
 *       422: { description: "Datos inválidos o PROPIEDAD_PROPIA." }
 */
resenasRouter.post('/', authenticate, requirePermission('resena.crear'), controller.crearResena);

/**
 * @openapi
 * /resenas/elegibilidad:
 *   get:
 *     tags: [Reseñas]
 *     summary: ¿Puedo calificar al vendedor de esta propiedad?
 *     description: Para que la interfaz muestre u oculte el formulario de reseña, con el motivo si no se puede.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: propiedad_id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Resultado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 puede_resenar: { type: boolean }
 *                 motivo:        { type: string, nullable: true, enum: [PROPIEDAD_PROPIA, YA_RESENADA, SIN_CONTACTO_NI_VISITA] }
 *                 mensaje:       { type: string, nullable: true }
 *                 por:           { type: array, items: { type: string, enum: [contacto, visita] }, description: "Qué le da derecho a calificar" }
 *                 resena:        { type: object, description: "La reseña que ya escribió (si motivo es YA_RESENADA)" }
 *       404: { description: La propiedad no existe. }
 */
resenasRouter.get('/elegibilidad', authenticate, controller.getElegibilidad);


export const vendedoresRouter = Router();

/**
 * @openapi
 * /vendedores/{id}:
 *   get:
 *     tags: [Reseñas]
 *     summary: Perfil público de un vendedor con su calificación promedio
 *     description: Sin correo ni teléfono (RNF-08). El promedio se calcula con todas sus reseñas en cada consulta.
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Perfil.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:                     { type: integer }
 *                 nombre:                 { type: string }
 *                 apellido:               { type: string }
 *                 foto_url:               { type: string, nullable: true }
 *                 miembro_desde:          { type: string, format: date-time }
 *                 verificado:             { type: boolean }
 *                 propiedades_publicadas: { type: integer }
 *                 calificacion:
 *                   type: object
 *                   properties:
 *                     promedio:     { type: number, nullable: true, example: 4.3, description: "Con un decimal; null si no tiene reseñas" }
 *                     total:        { type: integer, example: 7 }
 *                     distribucion: { type: object, example: { "5": 4, "4": 2, "3": 0, "2": 1, "1": 0 } }
 *       404: { description: No existe o no es un vendedor visible. }
 */
vendedoresRouter.get('/:id', controller.getPerfilVendedor);

/**
 * @openapi
 * /vendedores/{id}/resenas:
 *   get:
 *     tags: [Reseñas]
 *     summary: Reseñas de un vendedor (paginadas, la más reciente primero)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 10, maximum: 50 } }
 *     responses:
 *       200: { description: "Página de reseñas con data (id, calificacion, comentario, fecha_creacion, comprador con id y nombre, propiedad con id y titulo), total, page y pageSize." }
 *       404: { description: No existe o no es un vendedor visible. }
 */
vendedoresRouter.get('/:id/resenas', controller.getResenasVendedor);

// ── /propiedades/:id/comentarios-zona ─────────────────────────────────────────
export const comentariosZonaRouter = Router({ mergeParams: true });

/**
 * @openapi
 * tags:
 *   name: Comentarios de zona
 *   description: |
 *     Opiniones sobre la zona de una propiedad (seguridad, ruido, servicios…), uno por persona y propiedad.
 *     Solo comenta quien tuvo contacto real con la propiedad (misma regla que las reseñas). Se pueden
 *     reportar con `POST /reportes`; el administrador puede ocultarlos.
 */

/**
 * @openapi
 * /propiedades/{id}/comentarios-zona:
 *   get:
 *     tags: [Comentarios de zona]
 *     summary: Comentarios visibles sobre la zona de una propiedad
 *     description: |
 *       Del más reciente al más antiguo; los ocultados por moderación no aparecen. Con sesión incluye
 *       `mi_elegibilidad` ({ puede_comentar, motivo, mensaje, por, comentario }) para mostrar u ocultar el formulario.
 *     security: [{}, { bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 10, maximum: 50 } }
 *     responses:
 *       200:
 *         description: Página de comentarios.
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
 *                       id:             { type: integer }
 *                       comentario:     { type: string, example: "Zona tranquila, con tiendas y farmacia a dos cuadras." }
 *                       fecha_creacion: { type: string, format: date-time }
 *                       autor:          { type: object, properties: { id: { type: integer }, nombre: { type: string } } }
 *                       es_mio:         { type: boolean }
 *                 total:           { type: integer }
 *                 mi_elegibilidad: { type: object, description: "Solo con sesión" }
 *       404: { description: La propiedad no existe o no está publicada. }
 *   post:
 *     tags: [Comentarios de zona]
 *     summary: Comentar la zona de una propiedad
 *     description: Requiere haberle escrito al vendedor por esta propiedad o haberla visitado. Uno por persona y propiedad.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [comentario]
 *             properties:
 *               comentario: { type: string, minLength: 10, maxLength: 1000, example: "Zona tranquila de noche, el bus pasa cada 15 minutos." }
 *     responses:
 *       201: { description: Comentario publicado. }
 *       403: { description: "SIN_CONTACTO_NI_VISITA — no escribió por esta propiedad ni la visitó." }
 *       404: { description: La propiedad no existe o no está publicada. }
 *       409: { description: "YA_COMENTO — ya comentó la zona de esta propiedad." }
 *       422: { description: "Comentario muy corto o largo, o PROPIEDAD_PROPIA." }
 */
comentariosZonaRouter.get('/', optionalAuth, controller.getComentariosZona);
comentariosZonaRouter.post('/', authenticate, requirePermission('comentario_zona.crear'), controller.crearComentarioZona);
