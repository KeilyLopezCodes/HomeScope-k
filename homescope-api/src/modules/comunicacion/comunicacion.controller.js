import { ComunicacionService } from './comunicacion.service.js';
import {
  crearConversacionSchema, enviarMensajeSchema, actualizarConversacionSchema,
  paginaSchema, listarNotificacionesSchema, actualizarNotificacionSchema,
} from './comunicacion.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const service = new ComunicacionService();

function parseId(param) {
  const id = parseInt(param);
  if (isNaN(id) || id < 1) throw new AppError('ID_INVALIDO', 'ID inválido', 400);
  return id;
}

function validar(schema, datos) {
  const result = schema.safeParse(datos ?? {});
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      campo:   e.path.join('.'),
      mensaje: e.message,
    }));
    throw new AppError('VALIDACION', 'Datos inválidos', 422, details);
  }
  return result.data;
}

// ── Conversaciones ───────────────────────────────────────────────────────────

export async function listar(req, res, next) {
  try {
    res.json(await service.listarConversaciones(req.user.sub, validar(paginaSchema, req.query)));
  } catch (err) { next(err); }
}

export async function crear(req, res, next) {
  try {
    const datos = validar(crearConversacionSchema, req.body);
    const resultado = await service.iniciarConversacion(req.user.sub, datos);
    // 201 si se creó; 200 si ya existía y se reutilizó
    res.status(resultado.creada ? 201 : 200).json(resultado);
  } catch (err) { next(err); }
}

export async function actualizar(req, res, next) {
  try {
    const id = parseId(req.params.id);
    validar(actualizarConversacionSchema, req.body);
    res.json(await service.marcarLeida(id, req.user.sub));
  } catch (err) { next(err); }
}

export async function getMensajes(req, res, next) {
  try {
    const id = parseId(req.params.id);
    res.json(await service.obtenerMensajes(id, req.user.sub, validar(paginaSchema, req.query)));
  } catch (err) { next(err); }
}

export async function enviarMensaje(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const { contenido } = validar(enviarMensajeSchema, req.body);
    res.status(201).json(await service.enviarMensaje(id, req.user.sub, contenido));
  } catch (err) { next(err); }
}

// ── Notificaciones ───────────────────────────────────────────────────────────

export async function listarNotificaciones(req, res, next) {
  try {
    res.json(await service.listarNotificaciones(req.user.sub, validar(listarNotificacionesSchema, req.query)));
  } catch (err) { next(err); }
}

export async function actualizarNotificacion(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const { leida } = validar(actualizarNotificacionSchema, req.body);
    res.json(await service.actualizarNotificacion(id, req.user.sub, leida));
  } catch (err) { next(err); }
}
