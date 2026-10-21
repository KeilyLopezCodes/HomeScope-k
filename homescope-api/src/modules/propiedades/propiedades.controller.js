import { PropiedadesService } from './propiedades.service.js';
import {
  crearPropiedadSchema, editarPropiedadSchema, ESTADOS_VALIDOS,
  subirFotosSchema, ordenFotosSchema, listarPropiedadesSchema, historialPreciosSchema,
} from './propiedades.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const service = new PropiedadesService();

// ── Helpers ────────────────────────────────────────────────────────────────

function parseId(param) {
  const id = parseInt(param);
  if (isNaN(id)) throw new AppError('ID_INVALIDO', 'ID inválido', 400);
  return id;
}

function validar(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      campo:   e.path.join('.'),
      mensaje: e.message,
    }));
    throw new AppError('VALIDACION', 'Datos inválidos', 422, details);
  }
  return result.data;
}

// ── Endpoints públicos / opcionales ───────────────────────────────────────

export async function listar(req, res, next) {
  try {
    const query = validar(listarPropiedadesSchema, req.query);
    res.json(await service.listar(query));
  } catch (err) { next(err); }
}

export async function getById(req, res, next) {
  try {
    const id   = parseId(req.params.id);
    const solicitante = req.user ? { id: req.user.sub, roles: req.user.roles } : null;
    const data = await service.getById(id, solicitante);
    res.json(data);
  } catch (err) { next(err); }
}

export async function getHistorialPrecios(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const solicitante = req.user ? { id: req.user.sub, roles: req.user.roles } : null;
    res.json(await service.historialPrecios(id, validar(historialPreciosSchema, req.query), solicitante));
  } catch (err) { next(err); }
}

// ── Historial del usuario autenticado ─────────────────────────────────────

export async function listarMias(req, res, next) {
  try {
    res.json(await service.listarMias(req.user.sub));
  } catch (err) { next(err); }
}

export async function listarVistas(req, res, next) {
  try {
    res.json(await service.listarVistas(req.user.sub));
  } catch (err) { next(err); }
}

export async function registrarVista(req, res, next) {
  try {
    const id     = parseId(req.params.id);
    const origen = req.body?.origen ?? 'catalogo';
    await service.registrarVista(id, req.user.sub, origen);
    res.status(204).end();
  } catch (err) { next(err); }
}

// ── CRUD ───────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /propiedades:
 *   post:
 *     tags: [Propiedades]
 *     summary: Crear propiedad (borrador)
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
 *               tipo_propiedad_id: { type: integer, example: 1 }
 *               titulo:            { type: string,  example: "Casa en zona 10" }
 *               descripcion:       { type: string }
 *               modalidad:         { type: string, enum: [venta, alquiler] }
 *               precio:            { type: number, example: 350000 }
 *               moneda:            { type: string, enum: [GTQ, USD] }
 *               habitaciones:      { type: integer }
 *               banos:             { type: number }
 *               area_m2:           { type: number }
 *               parqueos:          { type: integer }
 *               direccion:         { type: string }
 *               zona:              { type: string }
 *               municipio:         { type: string }
 *               departamento:      { type: string }
 *               latitud:           { type: number }
 *               longitud:          { type: number }
 *               paso_formulario:   { type: integer, minimum: 1, maximum: 4 }
 *     responses:
 *       201:
 *         description: Propiedad creada como borrador.
 *       422:
 *         description: Datos inválidos.
 */
export async function crear(req, res, next) {
  try {
    const datos = validar(crearPropiedadSchema, req.body);
    const nueva = await service.crear(datos, req.user.sub);
    res.status(201).json(nueva);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /propiedades/{id}:
 *   put:
 *     tags: [Propiedades]
 *     summary: Editar propiedad (solo el dueño)
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
 *             description: Cualquier subconjunto de campos editables.
 *     responses:
 *       200:
 *         description: Propiedad actualizada.
 *       403:
 *         description: No eres el dueño.
 *       422:
 *         description: Estado no permite edición o datos inválidos.
 */
export async function actualizar(req, res, next) {
  try {
    const id    = parseId(req.params.id);
    const datos = validar(editarPropiedadSchema, req.body);
    const result = await service.actualizar(id, datos, req.user.sub);
    res.json(result);
  } catch (err) { next(err); }
}

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
 *         description: Propiedad eliminada.
 *       403:
 *         description: No eres el dueño.
 */
export async function eliminar(req, res, next) {
  try {
    const id = parseId(req.params.id);
    await service.eliminar(id, req.user.sub);
    res.status(204).end();
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /propiedades/{id}/publicar:
 *   post:
 *     tags: [Propiedades]
 *     summary: Publicar propiedad (borrador → publicado)
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
 *       422:
 *         description: Transición de estado no permitida.
 */
export async function publicar(req, res, next) {
  try {
    const id     = parseId(req.params.id);
    const result = await service.publicar(id, req.user.sub);
    res.json(result);
  } catch (err) { next(err); }
}

/**
 * @openapi
 * /propiedades/{id}/estado:
 *   patch:
 *     tags: [Propiedades]
 *     summary: Cambiar estado de la propiedad (solo el dueño)
 *     description: |
 *       Transiciones permitidas:
 *       - borrador → publicado
 *       - publicado → pausado | vendido | alquilado
 *       - pausado → publicado | vendido | alquilado
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
 *     responses:
 *       200:
 *         description: Estado actualizado.
 *       422:
 *         description: Transición no permitida.
 */
export async function cambiarEstado(req, res, next) {
  try {
    const id          = parseId(req.params.id);
    const nuevoEstado = req.body?.estado;
    if (!nuevoEstado || !ESTADOS_VALIDOS.includes(nuevoEstado))
      throw new AppError('VALIDACION', `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`, 422);
    const result = await service.cambiarEstado(id, nuevoEstado, req.user.sub);
    res.json(result);
  } catch (err) { next(err); }
}

// ── Fotos ──────────────────────────────────────────────────────────────────
// Todas responden con la lista actualizada de fotos de la propiedad (ordenada).

export async function agregarFotos(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const { portada } = validar(subirFotosSchema, req.body ?? {});
    const fotos = await service.agregarFotos(id, req.files, portada, req.user.sub);
    res.status(201).json(fotos);
  } catch (err) { next(err); }
}

export async function eliminarFoto(req, res, next) {
  try {
    const id     = parseId(req.params.id);
    const fotoId = parseId(req.params.fotoId);
    res.json(await service.eliminarFoto(id, fotoId, req.user.sub));
  } catch (err) { next(err); }
}

export async function reordenarFotos(req, res, next) {
  try {
    const id        = parseId(req.params.id);
    const { orden } = validar(ordenFotosSchema, req.body);
    res.json(await service.reordenarFotos(id, orden, req.user.sub));
  } catch (err) { next(err); }
}

export async function definirPortada(req, res, next) {
  try {
    const id     = parseId(req.params.id);
    const fotoId = parseId(req.params.fotoId);
    res.json(await service.definirPortada(id, fotoId, req.user.sub));
  } catch (err) { next(err); }
}
