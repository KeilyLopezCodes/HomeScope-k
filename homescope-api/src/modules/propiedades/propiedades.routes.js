import { Router } from 'express';
import { authenticate, optionalAuth, requirePermission } from '../../shared/middleware/auth.js';
import { subirArchivos } from '../../shared/middleware/upload.js';
import { FOTOS_CONFIG } from './propiedades.schemas.js';
import * as controller from './propiedades.controller.js';

const router = Router();

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
 *     summary: Listar propiedades publicadas (paginado)
 *     description: Catálogo público, solo propiedades en estado publicado. No incluye email ni teléfono del vendedor.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 50 }
 *     responses:
 *       200:
 *         description: Página de propiedades publicadas.
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
 *                       titulo:         { type: string }
 *                       direccion:      { type: string }
 *                       zona:           { type: string, nullable: true }
 *                       municipio:      { type: string, nullable: true }
 *                       departamento:   { type: string, nullable: true }
 *                       precio:         { type: string, example: "850000.00" }
 *                       moneda:         { type: string, example: GTQ }
 *                       modalidad:      { type: string, example: venta }
 *                       tipo_propiedad: { type: object, properties: { nombre: { type: string } } }
 *                       fotos:
 *                         type: array
 *                         description: Solo la foto de portada (0 o 1 elementos)
 *                         items: { type: object, properties: { url: { type: string } } }
 *                       indice_conveniencia:
 *                         type: object
 *                         nullable: true
 *                         description: Índice vigente; null mientras se calcula o si no hay coordenadas
 *                         properties:
 *                           puntaje:           { type: number, minimum: 0, maximum: 100, example: 86.71 }
 *                           nivel:             { type: string, enum: [verde, amarillo, rojo] }
 *                           version_algoritmo: { type: string, example: v1.0 }
 *                           fecha_calculo:     { type: string, format: date-time }
 *                 total:    { type: integer }
 *                 page:     { type: integer }
 *                 pageSize: { type: integer }
 *       422:
 *         description: Parámetros de paginación inválidos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
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
 *     summary: Detalle de una propiedad (ficha)
 *     description: |
 *       Ficha pública de una propiedad publicada. El token es opcional: con sesión se informa
 *       si el usuario es el dueño (`es_dueno`) y si la tiene en favoritos (`es_favorito`).
 *
 *       - Una propiedad no publicada (borrador, pausada, vendida…) responde 404, salvo para su dueño
 *         y para el administrador, que la reciben con su `estado`.
 *       - El `email` y `telefono` del vendedor **solo se incluyen** si el solicitante tiene una
 *         conversación con el vendedor sobre esta propiedad (RNF-08).
 *       - `indice_conveniencia` es el índice vigente con su desglose (docs/HomeScope_Indice_Conveniencia.md).
 *         `indice_estado` dice por qué falta: `en_calculo` (se está calculando en segundo plano) o
 *         `sin_ubicacion` (la propiedad no tiene coordenadas).
 *     security:
 *       - {}
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
 *                 id:                { type: integer }
 *                 titulo:            { type: string }
 *                 descripcion:       { type: string, nullable: true }
 *                 precio:            { type: string, example: "850000.00" }
 *                 moneda:            { type: string, example: GTQ }
 *                 modalidad:         { type: string, example: venta }
 *                 estado:            { type: string, example: publicado }
 *                 habitaciones:      { type: integer, nullable: true }
 *                 banos:             { type: string, nullable: true, example: "2.5" }
 *                 area_m2:           { type: string, nullable: true, example: "180.00" }
 *                 parqueos:          { type: integer, nullable: true }
 *                 direccion:         { type: string }
 *                 zona:              { type: string, nullable: true }
 *                 municipio:         { type: string, nullable: true }
 *                 departamento:      { type: string, nullable: true }
 *                 latitud:           { type: string, nullable: true }
 *                 longitud:          { type: string, nullable: true }
 *                 fecha_publicacion: { type: string, format: date-time, nullable: true }
 *                 tipo_propiedad:    { type: object, properties: { id: { type: integer }, nombre: { type: string } } }
 *                 fotos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:         { type: integer }
 *                       url:        { type: string }
 *                       orden:      { type: integer }
 *                       es_portada: { type: boolean }
 *                 historial_precios:
 *                   type: array
 *                   description: Cambios de precio, del más antiguo al más reciente
 *                   items:
 *                     type: object
 *                     properties:
 *                       precio_anterior: { type: string }
 *                       precio_nuevo:    { type: string }
 *                       fecha_cambio:    { type: string, format: date-time }
 *                 indice_estado: { type: string, enum: [calculado, en_calculo, sin_ubicacion] }
 *                 indice_conveniencia:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     puntaje:           { type: number, example: 86.71 }
 *                     nivel:             { type: string, enum: [verde, amarillo, rojo] }
 *                     version_algoritmo: { type: string, example: v1.0 }
 *                     fecha_calculo:     { type: string, format: date-time }
 *                     radio_m:           { type: integer, example: 1500, description: Radio dentro del cual los lugares suman al índice }
 *                     subpuntajes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categoria:          { type: string, example: transporte }
 *                           peso:               { type: number, example: 0.15 }
 *                           puntaje:            { type: number, example: 43.92 }
 *                           cantidad_puntos:    { type: integer, example: 2 }
 *                           distancia_minima_m: { type: integer, nullable: true, example: 519 }
 *                 es_dueno:       { type: boolean }
 *                 es_favorito:    { type: boolean }
 *                 vendedor:
 *                   type: object
 *                   properties:
 *                     id:                    { type: integer }
 *                     nombre:                { type: string }
 *                     apellido:              { type: string }
 *                     foto_url:              { type: string, nullable: true }
 *                     verificado:            { type: boolean }
 *                     calificacion_promedio: { type: number, nullable: true }
 *                     total_resenas:         { type: integer }
 *                     email:                 { type: string, description: "Solo si existe conversación" }
 *                     telefono:              { type: string, description: "Solo si existe conversación" }
 *       400:
 *         description: ID inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: La propiedad no existe o no está publicada.
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

/**
 * @openapi
 * /propiedades:
 *   post:
 *     tags: [Propiedades]
 *     summary: Crear propiedad (borrador)
 *     description: Crea la propiedad con estado `borrador`. Requiere permiso `propiedad.crear`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo_propiedad_id, titulo, modalidad, precio, moneda, direccion]
 *             properties:
 *               tipo_propiedad_id: { type: integer,  example: 1 }
 *               titulo:            { type: string,   example: "Casa amplia en zona residencial" }
 *               descripcion:       { type: string,   example: "Descripción detallada de la propiedad" }
 *               modalidad:         { type: string,   enum: [venta, alquiler] }
 *               precio:            { type: number,   example: 350000 }
 *               moneda:            { type: string,   enum: [GTQ, USD] }
 *               habitaciones:      { type: integer,  example: 3 }
 *               banos:             { type: number,   example: 2.5 }
 *               area_m2:           { type: number,   example: 120.5 }
 *               parqueos:          { type: integer,  example: 1 }
 *               direccion:         { type: string,   example: "5a Calle 10-20 Zona 1" }
 *               zona:              { type: string,   example: "Zona 1" }
 *               municipio:         { type: string,   example: "Jalapa" }
 *               departamento:      { type: string,   example: "Jalapa" }
 *               latitud:           { type: number,   example: 14.6349 }
 *               longitud:          { type: number,   example: -89.9836 }
 *               paso_formulario:   { type: integer,  minimum: 1, maximum: 4, example: 1 }
 *     responses:
 *       201:
 *         description: Propiedad creada como borrador.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:             { type: integer }
 *                 titulo:         { type: string }
 *                 estado:         { type: string, example: borrador }
 *                 fecha_creacion: { type: string, format: date-time }
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Sin permiso.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Datos inválidos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', authenticate, requirePermission('propiedad.crear'), controller.crear);

/**
 * @openapi
 * /propiedades/{id}:
 *   put:
 *     tags: [Propiedades]
 *     summary: Editar propiedad (solo el dueño)
 *     description: |
 *       Actualiza cualquier subconjunto de campos. Solo el vendedor dueño puede editar.
 *       Si cambia el precio, se registra automáticamente en `historial_precio`.
 *       Si cambian `latitud` o `longitud` de una propiedad publicada, se encola el recálculo del
 *       Índice de Conveniencia (`recalculando_indice: true`); el nuevo índice aparece en la ficha en segundos.
 *       No se puede editar una propiedad con estado `vendido` o `alquilado`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Cualquier subconjunto de campos editables (al menos uno).
 *             properties:
 *               titulo:       { type: string }
 *               descripcion:  { type: string }
 *               precio:       { type: number }
 *               moneda:       { type: string, enum: [GTQ, USD] }
 *               habitaciones: { type: integer }
 *               banos:        { type: number }
 *               area_m2:      { type: number }
 *               parqueos:     { type: integer }
 *               direccion:    { type: string }
 *               zona:         { type: string }
 *               municipio:    { type: string }
 *               departamento: { type: string }
 *     responses:
 *       200:
 *         description: Propiedad actualizada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:                  { type: integer }
 *                 titulo:              { type: string }
 *                 estado:              { type: string }
 *                 fecha_actualizacion: { type: string, format: date-time }
 *                 recalculando_indice: { type: boolean }
 *       403:
 *         description: No eres el dueño de esta propiedad.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Estado no permite edición o datos inválidos.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/:id', authenticate, controller.actualizar);

/**
 * @openapi
 * /propiedades/{id}:
 *   delete:
 *     tags: [Propiedades]
 *     summary: Eliminar propiedad (solo el dueño)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Propiedad eliminada correctamente.
 *       403:
 *         description: No eres el dueño de esta propiedad.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Propiedad no encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:id', authenticate, controller.eliminar);

/**
 * @openapi
 * /propiedades/{id}/publicar:
 *   post:
 *     tags: [Propiedades]
 *     summary: Publicar propiedad (borrador → publicado)
 *     description: |
 *       Transición de estado `borrador` a `publicado`. Solo el dueño.
 *       Encola el cálculo del Índice de Conveniencia, que se guarda en segundo plano (ADR-08).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Propiedad publicada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:     { type: integer }
 *                 estado: { type: string, example: publicado }
 *       403:
 *         description: No eres el dueño.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Transición no permitida desde el estado actual.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:id/publicar', authenticate, requirePermission('propiedad.crear'), controller.publicar);

/**
 * @openapi
 * /propiedades/{id}/estado:
 *   patch:
 *     tags: [Propiedades]
 *     summary: Cambiar estado de la propiedad (solo el dueño)
 *     description: |
 *       Transiciones permitidas:
 *       - `borrador` → `publicado`
 *       - `publicado` → `pausado`, `vendido`, `alquilado`
 *       - `pausado` → `publicado`, `vendido`, `alquilado`
 *       - `vendido` y `alquilado` son estados finales (sin transición posible).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [publicado, pausado, vendido, alquilado]
 *                 example: pausado
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:     { type: integer }
 *                 estado: { type: string }
 *       403:
 *         description: No eres el dueño.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Transición de estado no permitida.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:id/estado', authenticate, controller.cambiarEstado);

/**
 * @openapi
 * /propiedades/{id}/fotos:
 *   post:
 *     tags: [Propiedades]
 *     summary: Subir fotos a una propiedad (solo el dueño)
 *     description: |
 *       Carga múltiple (campo `fotos`). Formatos JPG, PNG o WEBP, máximo 5 MB por imagen
 *       y 10 fotos por propiedad. Las fotos se agregan al final del orden actual.
 *       Si la propiedad no tenía portada y no se indica `portada`, la primera imagen enviada pasa a ser la portada.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [fotos]
 *             properties:
 *               fotos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               portada:
 *                 type: integer
 *                 description: Índice (desde 0) de la imagen enviada que será la portada.
 *     responses:
 *       201:
 *         description: Lista actualizada de fotos de la propiedad.
 *       403:
 *         description: No eres el dueño.
 *       413:
 *         description: Alguna imagen supera el tamaño máximo.
 *       422:
 *         description: Formato no permitido o límite de fotos excedido.
 */
router.post('/:id/fotos', authenticate,
  subirArchivos('fotos', {
    maxArchivos: FOTOS_CONFIG.maxPorPropiedad,
    maxBytes:    FOTOS_CONFIG.maxBytes,
    tipos:       FOTOS_CONFIG.tipos,
  }),
  controller.agregarFotos);

/**
 * @openapi
 * /propiedades/{id}/fotos/orden:
 *   put:
 *     tags: [Propiedades]
 *     summary: Reordenar las fotos de una propiedad (solo el dueño)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orden]
 *             properties:
 *               orden:
 *                 type: array
 *                 description: Todos los ids de fotos de la propiedad en el nuevo orden.
 *                 items: { type: integer }
 *                 example: [12, 10, 11]
 *     responses:
 *       200:
 *         description: Lista actualizada de fotos.
 *       422:
 *         description: El orden no incluye exactamente todas las fotos.
 */
router.put('/:id/fotos/orden', authenticate, controller.reordenarFotos);

/**
 * @openapi
 * /propiedades/{id}/fotos/{fotoId}/portada:
 *   patch:
 *     tags: [Propiedades]
 *     summary: Definir la foto de portada (solo el dueño)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: fotoId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista actualizada de fotos.
 *       404:
 *         description: Foto no encontrada.
 */
router.patch('/:id/fotos/:fotoId/portada', authenticate, controller.definirPortada);

/**
 * @openapi
 * /propiedades/{id}/fotos/{fotoId}:
 *   delete:
 *     tags: [Propiedades]
 *     summary: Eliminar una foto (solo el dueño)
 *     description: Si era la portada, la primera foto restante pasa a ser la portada.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: fotoId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista actualizada de fotos.
 *       404:
 *         description: Foto no encontrada.
 */
router.delete('/:id/fotos/:fotoId', authenticate, controller.eliminarFoto);

export default router;
