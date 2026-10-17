import { GeoIndiceService } from './geo-indice.service.js';
import { puntosInteresSchema } from './geo-indice.schemas.js';
import { AppError } from '../../shared/errors/AppError.js';

const service = new GeoIndiceService();

function validar(schema, datos) {
  const result = schema.safeParse(datos);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      campo:   e.path.join('.'),
      mensaje: e.message,
    }));
    throw new AppError('VALIDACION', 'Datos inválidos', 422, details);
  }
  return result.data;
}

export async function buscarPuntosInteres(req, res, next) {
  try {
    const query = validar(puntosInteresSchema, req.query);
    const resultado = await service.buscarPuntosInteres(query);
    res.set('X-Cache', resultado.desde_cache ? 'HIT' : 'MISS').json(resultado);
  } catch (err) { next(err); }
}

// TODO: índice y puntos de interés precalculados de una propiedad (ADR-08)
export const getIndice = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const getPuntosInteres = (_req, res) => res.status(501).json({ message: 'Not implemented' });
