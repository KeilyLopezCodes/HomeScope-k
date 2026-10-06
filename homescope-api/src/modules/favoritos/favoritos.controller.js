import { FavoritosService } from './favoritos.service.js';

const service = new FavoritosService();

export async function listar(req, res, next) {
  try {
    res.json(await service.listar(req.user.sub));
  } catch (err) { next(err); }
}

export async function agregar(req, res, next) {
  try {
    const propiedadId = parseInt(req.params.propiedadId);
    if (isNaN(propiedadId)) return res.status(400).json({ error: { code: 'ID_INVALIDO', message: 'ID inválido' } });
    await service.agregar(req.user.sub, propiedadId);
    res.status(201).end();
  } catch (err) { next(err); }
}

export async function eliminar(req, res, next) {
  try {
    const propiedadId = parseInt(req.params.propiedadId);
    await service.eliminar(req.user.sub, propiedadId);
    res.status(204).end();
  } catch (err) { next(err); }
}
