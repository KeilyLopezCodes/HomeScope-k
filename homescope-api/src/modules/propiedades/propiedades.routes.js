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
 *     summary: Catálogo de propiedades publicadas, con búsqueda por texto y filtros
 *     description: |
 *       Sin parámetros devuelve el catálogo completo de propiedades publicadas, de la más reciente a la más antigua.
 *       Con parámetros filtra esa misma colección: todos son opcionales y se combinan (se deben cumplir todos).
 *       Siempre paginado (RNF-02). No incluye email ni teléfono del vendedor.
 *
 *       - `q` busca en título, descripción, dirección, zona, municipio y departamento con texto completo
 *         en español: no distingue tildes ni mayúsculas y encuentra plurales y variaciones ("casas" encuentra "casa").
 *         Admite frases entre comillas y excluir palabras con `-` (por ejemplo `casa -terreno`).
 *       - Los filtros de precio se comparan en la moneda indicada (`GTQ` si no se indica) y solo
 *         incluyen propiedades publicadas en esa moneda.
 *       - `indice_min` excluye las propiedades que aún no tienen índice calculado.
 *       - Sin `orden`: por relevancia si hay `q`, si no las más recientes.
 *     parameters:
 *       - { in: query, name: q, description: "Texto a buscar (2 a 100 caracteres)", schema: { type: string, example: "casa jardin" } }
 *       - { in: query, name: modalidad, schema: { type: string, enum: [venta, alquiler] } }
 *       - { in: query, name: tipo, description: "Uno o varios separados por coma", schema: { type: string, example: "casa,apartamento" } }
 *       - { in: query, name: precio_min, schema: { type: number, minimum: 0, example: 100000 } }
 *       - { in: query, name: precio_max, schema: { type: number, minimum: 0, example: 600000 } }
 *       - { in: query, name: moneda, description: "Moneda de los filtros de precio (por defecto GTQ)", schema: { type: string, enum: [GTQ, USD] } }
 *       - { in: query, name: habitaciones_min, schema: { type: integer, minimum: 0, maximum: 20, example: 2 } }
 *       - { in: query, name: indice_min, description: "Puntaje mínimo del Índice de Conveniencia (0–100)", schema: { type: number, minimum: 0, maximum: 100, example: 70 } }
 *       - { in: query, name: orden, schema: { type: string, enum: [relevancia, recientes, precio_asc, precio_desc, indice_desc] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1, minimum: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, minimum: 1, maximum: 50 } }
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
 *                 total:    { type: integer, description: Propiedades que cumplen el texto y los filtros }
 *                 page:     { type: integer }
 *                 pageSize: { type: integer }
 *                 filtros:
 *                   type: object
 *                   description: Filtros aplicados, con los valores por defecto de `orden` y `moneda`
 *                   example: { q: "casa", modalidad: venta, indice_min: 70, orden: relevancia }
 *       422:
 *         description: Algún parámetro es inválido (por ejemplo, un tipo inexistente o precio_min mayor que precio_max).
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
 *     summary: Mis propiedades — todas las del vendedor autenticado, en cualquier estado
 *     description: |
 *       Paginado, de la modificada más recientemente a la más antigua. `estado` elige la pestaña
 *       (`cerrada` = vendidas o alquiladas) y `conteos` trae cuántas hay en cada una.
 *       Para las publicadas indica la vigencia: `dias_para_expirar`, `por_expirar` (7 días o menos: se puede
 *       renovar con `POST /propiedades/{id}/renovar`) y `expirada`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: estado, schema: { type: string, enum: [todas, borrador, publicado, pausado, cerrada], default: todas } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 10, maximum: 50 } }
 *     responses:
 *       200:
 *         description: Página de propiedades del vendedor.
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
 *                       titulo:            { type: string }
 *                       precio:            { type: string }
 *                       moneda:            { type: string, example: GTQ }
 *                       modalidad:         { type: string, example: venta }
 *                       estado:            { type: string, enum: [borrador, publicado, pausado, vendido, alquilado] }
 *                       paso_formulario:   { type: integer, description: "Paso donde quedó un borrador (1–4)" }
 *                       portada:           { type: string, nullable: true }
 *                       fecha_publicacion: { type: string, format: date-time, nullable: true }
 *                       fecha_expiracion:  { type: string, format: date-time, nullable: true }
 *                       dias_para_expirar: { type: integer, nullable: true }
 *                       por_expirar:       { type: boolean }
 *                       expirada:          { type: boolean }
 *                 total:    { type: integer }
 *                 page:     { type: integer }
 *                 pageSize: { type: integer }
 *                 conteos:
 *                   type: object
 *                   example: { todas: 37, borrador: 3, publicado: 30, pausado: 2, cerrada: 2 }
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/mias', authenticate, controller.listarMias);

/**
 * @openapi
 * /propiedades/mias/estadisticas:
 *   get:
 *     tags: [Propiedades]
 *     summary: Panel del vendedor — vistas, favoritos y mensajes de sus propiedades
 *     description: |
 *       Estadísticas de las propiedades del vendedor autenticado (sin borradores) en los últimos `dias` días,
 *       hoy incluido, por día en hora de Guatemala.
 *       - `serie`: una fila por día con las vistas, los favoritos agregados y los mensajes de interesados.
 *       - `propiedades`: métricas del período y totales históricos de cada una, `tasa_interes`
 *         (% de vistas que terminaron en favorito o primer mensaje), `desempeno`
 *         (`bajo`, `normal`, `nueva`, `pausada`, `cerrada`) y `sugerencias`.
 *       - Bajo desempeño: menos vistas por día publicada que el mínimo (5 cada 30 días) o que la mitad del
 *         promedio diario de sus publicadas, o muchas vistas (40 cada 30 días, mínimo 25) sin ningún favorito ni mensaje. Las publicadas hace menos de 3 días no se evalúan.
 *
 *       Con `propiedad_id` todo (resumen, serie y lista) se limita a esa propiedad.
 *       Solo cuentan los mensajes de los interesados, no las respuestas del vendedor.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: dias, schema: { type: integer, enum: [7, 30, 90], default: 30 } }
 *       - { in: query, name: propiedad_id, schema: { type: integer }, description: "Limitar a una propiedad" }
 *     responses:
 *       200:
 *         description: Estadísticas del período.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo: { type: object, example: { dias: 30, desde: "2026-09-21", hasta: "2026-10-20" } }
 *                 resumen: { type: object, example: { vistas: 412, favoritos: 23, mensajes: 31, contactos: 14, tasa_interes: 9 } }
 *                 serie:
 *                   type: array
 *                   items:
 *                     type: object
 *                     example: { fecha: "2026-10-20", vistas: 18, favoritos: 1, mensajes: 2 }
 *                 propiedades:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:         { type: integer }
 *                       titulo:     { type: string }
 *                       estado:     { type: string }
 *                       portada:    { type: string, nullable: true }
 *                       metricas:   { type: object, example: { vistas: 3, favoritos: 0, mensajes: 0, contactos: 0, mensajes_sin_leer: 0, tasa_interes: 0 } }
 *                       totales:    { type: object, example: { vistas: 40, favoritos: 2, mensajes: 5 } }
 *                       desempeno:  { type: string, enum: [bajo, normal, nueva, pausada, cerrada] }
 *                       sugerencias:
 *                         type: array
 *                         items:
 *                           type: object
 *                           example: { codigo: POCAS_FOTOS, nivel: consejo, mensaje: "Agrega más fotos: tiene 2 y los anuncios con 5 o más llaman más la atención." }
 *                 promedio_vistas_dia: { type: number, description: "Promedio de vistas por día publicada de sus publicadas en el período" }
 *       401: { description: Token requerido. }
 *       404: { description: "propiedad_id no es una de sus propiedades publicadas." }
 *       422: { description: Período inválido. }
 */
router.get('/mias/estadisticas', authenticate, controller.estadisticas);

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
 * /propiedades/{id}/historial-precios:
 *   get:
 *     tags: [Propiedades]
 *     summary: Historial de precios de una propiedad
 *     description: |
 *       Cada vez que el dueño cambia el precio o la moneda (`PUT /propiedades/{id}`) se registra
 *       automáticamente un cambio con la fecha, el precio y la moneda anterior y nuevo. Del cambio más
 *       reciente al más antiguo. `variacion` indica cuánto subió o bajó (o `cambio_moneda` si cambió la moneda).
 *       Misma visibilidad que la ficha: una propiedad no publicada responde 404, salvo para su dueño y el administrador.
 *     security: [{}, { bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: pageSize, schema: { type: integer, default: 20, maximum: 50 } }
 *     responses:
 *       200:
 *         description: Historial paginado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 precio_actual: { type: string, example: "321" }
 *                 moneda_actual: { type: string, example: USD }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:              { type: integer }
 *                       fecha_cambio:    { type: string, format: date-time }
 *                       precio_anterior: { type: string, example: "369" }
 *                       moneda_anterior: { type: string, example: USD }
 *                       precio_nuevo:    { type: string, example: "321" }
 *                       moneda_nueva:    { type: string, example: USD }
 *                       variacion:
 *                         type: object
 *                         properties:
 *                           tipo:       { type: string, enum: [baja, subida, cambio_moneda] }
 *                           monto:      { type: number, example: -48 }
 *                           porcentaje: { type: number, example: -13 }
 *                 total:    { type: integer }
 *                 page:     { type: integer }
 *                 pageSize: { type: integer }
 *       404: { description: La propiedad no existe o no está publicada. }
 */
router.get('/:id/historial-precios', optionalAuth, controller.getHistorialPrecios);

/**
 * @openapi
 * /propiedades/{id}/vista:
 *   post:
 *     tags: [Propiedades]
 *     summary: Registrar una vista de la ficha
 *     description: |
 *       La ficha la llama cada vez que se abre. Cuenta con o sin sesión (los visitantes anónimos
 *       también suman). No cuenta si quien la abre es el propio vendedor, ni si la propiedad no está
 *       publicada; en esos casos también responde 204, sin registrar nada. Con sesión, la vista
 *       además entra al historial del usuario (`GET /propiedades/vistas`).
 *     security: [{}, { bearerAuth: [] }]
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
 *         description: Recibida (registrada si corresponde).
 *       422:
 *         description: Origen inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:id/vista', optionalAuth, controller.registrarVista);

/**
 * @openapi
 * /propiedades/{id}/estadisticas:
 *   get:
 *     tags: [Propiedades]
 *     summary: Estadísticas de una propiedad por día (solo el dueño)
 *     description: |
 *       Vistas, favoritos y mensajes de interesados de la propiedad en los últimos `dias` días, por día
 *       (hora de Guatemala), con los totales históricos, la tasa de interés, el desempeño y, si está por
 *       debajo del umbral, `sugerencias` para mejorarla. Mismas reglas que `GET /propiedades/mias/estadisticas`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: dias, schema: { type: integer, enum: [7, 30, 90], default: 30 } }
 *     responses:
 *       200:
 *         description: Estadísticas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo:     { type: object, example: { dias: 30, desde: "2026-09-21", hasta: "2026-10-20" } }
 *                 propiedad:   { type: object, example: { id: 53, titulo: "Local comercial #9", estado: publicado } }
 *                 metricas:    { type: object, example: { vistas: 2, favoritos: 0, mensajes: 0, contactos: 0, mensajes_sin_leer: 0, tasa_interes: 0 } }
 *                 totales:     { type: object, example: { vistas: 6, favoritos: 0, mensajes: 0 } }
 *                 desempeno:   { type: string, enum: [bajo, normal, nueva, pausada, cerrada] }
 *                 sugerencias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     example: { codigo: POCAS_VISTAS, nivel: alerta, mensaje: "Solo 2 vistas en los últimos 30 días, menos que tus otras propiedades." }
 *                 serie:
 *                   type: array
 *                   items:
 *                     type: object
 *                     example: { fecha: "2026-10-20", vistas: 1, favoritos: 0, mensajes: 0 }
 *       401: { description: Token requerido. }
 *       403: { description: "SIN_PERMISO — no es el dueño." }
 *       404: { description: La propiedad no existe. }
 *       422: { description: "Período inválido o la propiedad es un borrador." }
 */
router.get('/:id/estadisticas', authenticate, controller.estadisticasPropiedad);

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
 *       Si cambia el precio o la moneda, el cambio se registra automáticamente en el historial
 *       (`GET /propiedades/{id}/historial-precios`), en la misma transacción que la edición.
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
 *                 precio_registrado_en_historial: { type: boolean, description: "true si cambió el precio o la moneda" }
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
 *       Transición de estado `borrador` a `publicado`. Solo el dueño, con el correo verificado
 *       (si no, 403 `CORREO_NO_VERIFICADO`). El anuncio queda vigente 60 días.
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
 * /propiedades/{id}/renovar:
 *   post:
 *     tags: [Propiedades]
 *     summary: Renovar un anuncio por expirar (solo el dueño)
 *     description: |
 *       Los anuncios publicados vencen 60 días después de publicarse o renovarse. Cuando faltan 7 días o menos
 *       (o ya venció), renovar le da 60 días más desde hoy.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: "Nueva vigencia: { id, estado, fecha_expiracion, dias_para_expirar, por_expirar }" }
 *       403: { description: No eres el dueño. }
 *       422: { description: "No está publicada (ESTADO_INVALIDO) o aún faltan más de 7 días (AUN_VIGENTE)." }
 */
router.post('/:id/renovar', authenticate, controller.renovar);

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
 *
 *       Reactivar (`pausado` → `publicado`) aplica la misma política que publicar: con el correo sin verificar
 *       responde 403 `CORREO_NO_VERIFICADO`. Si el anuncio había vencido, empieza una vigencia nueva de 60 días.
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
