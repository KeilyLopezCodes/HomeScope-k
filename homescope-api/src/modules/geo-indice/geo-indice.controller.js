import { GeoIndiceService } from './geo-indice.service.js';
import { puntosInteresSchema, puntosInteresPropiedadSchema } from './geo-indice.schemas.js';
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

export async function puntosInteresDePropiedad(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('ID_INVALIDO', 'ID inválido', 400);
    const filtros     = validar(puntosInteresPropiedadSchema, req.query);
    const solicitante = req.user ? { id: req.user.sub, roles: req.user.roles } : null;
    const resultado   = await service.puntosInteresDePropiedad(id, filtros, solicitante);
    res.set('X-Cache', resultado.desde_cache ? 'HIT' : 'MISS').json(resultado);
  } catch (err) { next(err); }
}

export async function getIndice(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new AppError('ID_INVALIDO', 'ID inválido', 400);
    const solicitante = req.user ? { id: req.user.sub, roles: req.user.roles } : null;
    res.json(await service.indiceConComentarios(id, solicitante));
  } catch (err) { next(err); }
}
