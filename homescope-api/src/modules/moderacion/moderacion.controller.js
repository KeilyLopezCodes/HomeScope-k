import { ModeracionService } from './moderacion.service.js';
import {
  crearReporteSchema, listarReportesSchema, resolverReporteSchema,
  listarPropiedadesAdminSchema, listarUsuariosAdminSchema, crearAccionSchema, listarAccionesSchema,
} from './moderacion.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const service = new ModeracionService();

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

const usuarioDe = (req) => ({ id: req.user.sub, roles: req.user.roles });

// ── Reportes (cualquier usuario con sesión) ──────────────────────────────────

export async function crearReporte(req, res, next) {
  try {
    res.status(201).json(await service.crearReporte(req.user.sub, validar(crearReporteSchema, req.body)));
  } catch (err) { next(err); }
}

// ── Administración (el router /admin ya exige el rol administrador) ──────────

export async function getReportes(req, res, next) {
  try {
    res.json(await service.listarReportes(validar(listarReportesSchema, req.query)));
  } catch (err) { next(err); }
}

export async function resolverReporte(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('ID_INVALIDO', 'ID inválido', 400);
    res.json(await service.resolverReporte(usuarioDe(req), id, validar(resolverReporteSchema, req.body)));
  } catch (err) { next(err); }
}

export async function getPropiedades(req, res, next) {
  try {
    res.json(await service.listarPropiedades(validar(listarPropiedadesAdminSchema, req.query)));
  } catch (err) { next(err); }
}

export async function getUsuarios(req, res, next) {
  try {
    res.json(await service.listarUsuarios(validar(listarUsuariosAdminSchema, req.query)));
  } catch (err) { next(err); }
}

export async function crearAccion(req, res, next) {
  try {
    res.status(201).json(await service.ejecutarAccion(usuarioDe(req), validar(crearAccionSchema, req.body)));
  } catch (err) { next(err); }
}

export async function getAcciones(req, res, next) {
  try {
    res.json(await service.listarAcciones(validar(listarAccionesSchema, req.query)));
  } catch (err) { next(err); }
}

// TODO: verificación de vendedores
export const getVerificaciones = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const resolverVerificacion = (_req, res) => res.status(501).json({ message: 'Not implemented' });
