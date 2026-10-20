import { ModeracionService } from './moderacion.service.js';
import { crearReporteSchema, listarReportesSchema, resolverReporteSchema } from './moderacion.schemas.js';
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

// ── Administración ───────────────────────────────────────────────────────────

export async function getReportes(req, res, next) {
  try {
    res.json(await service.listarReportes(usuarioDe(req), validar(listarReportesSchema, req.query)));
  } catch (err) { next(err); }
}

export async function resolverReporte(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('ID_INVALIDO', 'ID inválido', 400);
    res.json(await service.resolverReporte(usuarioDe(req), id, validar(resolverReporteSchema, req.body)));
  } catch (err) { next(err); }
}

// TODO: gestión de usuarios y verificación de vendedores
export const getUsuarios = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const cambiarEstadoUsuario = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const getVerificaciones = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const resolverVerificacion = (_req, res) => res.status(501).json({ message: 'Not implemented' });
