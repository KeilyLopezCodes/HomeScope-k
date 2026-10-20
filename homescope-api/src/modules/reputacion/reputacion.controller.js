import { ReputacionService } from './reputacion.service.js';
import {
  crearResenaSchema, elegibilidadSchema, listarResenasSchema, crearComentarioZonaSchema, listarComentariosSchema,
} from './reputacion.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const service = new ReputacionService();

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

export async function crearResena(req, res, next) {
  try {
    const datos = validar(crearResenaSchema, req.body);
    res.status(201).json(await service.crearResena(req.user.sub, datos));
  } catch (err) { next(err); }
}

export async function getElegibilidad(req, res, next) {
  try {
    const { propiedad_id } = validar(elegibilidadSchema, req.query);
    res.json(await service.elegibilidad(req.user.sub, propiedad_id));
  } catch (err) { next(err); }
}

export async function getPerfilVendedor(req, res, next) {
  try {
    res.json(await service.perfilVendedor(parseId(req.params.id)));
  } catch (err) { next(err); }
}

export async function getResenasVendedor(req, res, next) {
  try {
    res.json(await service.resenasDeVendedor(parseId(req.params.id), validar(listarResenasSchema, req.query)));
  } catch (err) { next(err); }
}

// ── Comentarios de la zona de una propiedad ─────────────────────────────────

export async function getComentariosZona(req, res, next) {
  try {
    const solicitante = req.user ? { id: req.user.sub, roles: req.user.roles } : null;
    res.json(await service.comentariosZona(parseId(req.params.id), validar(listarComentariosSchema, req.query), solicitante));
  } catch (err) { next(err); }
}

export async function crearComentarioZona(req, res, next) {
  try {
    const { comentario } = validar(crearComentarioZonaSchema, req.body);
    res.status(201).json(await service.crearComentarioZona(req.user.sub, parseId(req.params.id), comentario));
  } catch (err) { next(err); }
}
