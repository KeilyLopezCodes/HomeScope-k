import { AgendaService } from './agenda.service.js';
import {
  disponibilidadSchema, horariosSchema, solicitarVisitaSchema, actualizarVisitaSchema, listarVisitasSchema,
} from './agenda.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const service = new AgendaService();

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

// ── Disponibilidad del vendedor autenticado ─────────────────────────────────

export async function getDisponibilidad(req, res, next) {
  try {
    res.json(await service.obtenerDisponibilidad(req.user.sub));
  } catch (err) { next(err); }
}

export async function setDisponibilidad(req, res, next) {
  try {
    const { franjas } = validar(disponibilidadSchema, req.body);
    res.json(await service.guardarDisponibilidad({ id: req.user.sub, roles: req.user.roles }, franjas));
  } catch (err) { next(err); }
}

// ── Horarios libres de una propiedad ─────────────────────────────────────────

export async function getHorarios(req, res, next) {
  try {
    const id = parseId(req.params.id);
    res.json(await service.horariosDePropiedad(id, validar(horariosSchema, req.query)));
  } catch (err) { next(err); }
}

// ── Visitas ──────────────────────────────────────────────────────────────────

export async function getVisitas(req, res, next) {
  try {
    res.json(await service.listarVisitas(req.user.sub, validar(listarVisitasSchema, req.query)));
  } catch (err) { next(err); }
}

export async function getVisita(req, res, next) {
  try {
    res.json(await service.obtenerVisita(parseId(req.params.id), req.user.sub));
  } catch (err) { next(err); }
}

export async function solicitarVisita(req, res, next) {
  try {
    const datos = validar(solicitarVisitaSchema, req.body);
    res.status(201).json(await service.solicitarVisita(req.user.sub, datos));
  } catch (err) { next(err); }
}

export async function actualizarVisita(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const cambio = validar(actualizarVisitaSchema, req.body);
    res.json(await service.actualizarVisita(id, req.user.sub, cambio));
  } catch (err) { next(err); }
}
