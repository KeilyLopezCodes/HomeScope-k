import { ModeracionService } from './moderacion.service.js';
import { VerificacionService } from './verificacion.service.js';
import {
  crearReporteSchema, listarReportesSchema, resolverReporteSchema,
  listarPropiedadesAdminSchema, listarUsuariosAdminSchema, crearAccionSchema, listarAccionesSchema,
  estadisticasPlataformaSchema,
  solicitarVerificacionSchema, listarVerificacionesSchema, resolverVerificacionSchema,
} from './moderacion.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const service = new ModeracionService();
const verificacion = new VerificacionService();

const idDe = (req) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError('ID_INVALIDO', 'ID inválido', 400);
  return id;
};

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

export async function getEstadisticas(req, res, next) {
  try {
    res.json(await service.estadisticasPlataforma(validar(estadisticasPlataformaSchema, req.query)));
  } catch (err) { next(err); }
}

export async function getAcciones(req, res, next) {
  try {
    res.json(await service.listarAcciones(validar(listarAccionesSchema, req.query)));
  } catch (err) { next(err); }
}

// ── Verificación de vendedores ───────────────────────────────────────────────

export async function getMiVerificacion(req, res, next) {
  try {
    res.json(await verificacion.miVerificacion(req.user.sub));
  } catch (err) { next(err); }
}

export async function solicitarVerificacion(req, res, next) {
  try {
    const datos = validar(solicitarVerificacionSchema, req.body);
    res.status(201).json(await verificacion.solicitar(usuarioDe(req), datos, req.files?.[0]));
  } catch (err) { next(err); }
}

export async function getVerificaciones(req, res, next) {
  try {
    res.json(await verificacion.listar(validar(listarVerificacionesSchema, req.query)));
  } catch (err) { next(err); }
}

// El documento se envía como archivo (solo administrador) y no se guarda en caché del navegador
export async function getDocumentoVerificacion(req, res, next) {
  try {
    const { buffer, mimetype } = await verificacion.documento(idDe(req));
    res.set({ 'Content-Type': mimetype, 'Cache-Control': 'no-store', 'Content-Disposition': 'inline' }).send(buffer);
  } catch (err) { next(err); }
}

export async function resolverVerificacion(req, res, next) {
  try {
    res.json(await verificacion.resolver(usuarioDe(req), idDe(req), validar(resolverVerificacionSchema, req.body)));
  } catch (err) { next(err); }
}
