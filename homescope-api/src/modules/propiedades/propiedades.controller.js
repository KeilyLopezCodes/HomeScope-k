import { PropiedadesService } from './propiedades.service.js';

const service = new PropiedadesService();

export async function listar(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    res.json(await service.listar({ page, limit }));
  } catch (err) { next(err); }
}

export async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: { code: 'ID_INVALIDO', message: 'ID inválido' } });
    const data = await service.getById(id, req.user?.sub ?? null);
    res.json(data);
  } catch (err) { next(err); }
}

// GET /propiedades/mias — propiedades publicadas por el vendedor autenticado
export async function listarMias(req, res, next) {
  try {
    res.json(await service.listarMias(req.user.sub));
  } catch (err) { next(err); }
}

// GET /propiedades/vistas — propiedades vistas por el comprador autenticado
export async function listarVistas(req, res, next) {
  try {
    res.json(await service.listarVistas(req.user.sub));
  } catch (err) { next(err); }
}

// POST /propiedades/:id/vista — registrar vista de una propiedad
export async function registrarVista(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: { code: 'ID_INVALIDO', message: 'ID inválido' } });
    const origen = req.body?.origen ?? 'catalogo';
    await service.registrarVista(id, req.user.sub, origen);
    res.status(204).end();
  } catch (err) { next(err); }
}

export const crear       = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const actualizar  = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const eliminar    = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const publicar    = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const agregarFoto  = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const eliminarFoto = (_req, res) => res.status(501).json({ message: 'Not implemented' });
