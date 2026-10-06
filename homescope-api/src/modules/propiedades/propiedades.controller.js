import { PropiedadesService } from './propiedades.service.js';

const service = new PropiedadesService();

export async function listar(req, res, next) {
  try {
    // GET /propiedades?mias=true  → historial del vendedor autenticado
    if (req.query.mias === 'true') {
      if (!req.user) return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'Token requerido' } });
      const data = await service.listarMias(req.user.sub);
      return res.json(data);
    }
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const data = await service.listar({ page, limit });
    res.json(data);
  } catch (err) { next(err); }
}

export async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: { code: 'ID_INVALIDO', message: 'ID inválido' } });
    const solicitanteId = req.user?.sub ?? null;
    const data = await service.getById(id, solicitanteId);
    res.json(data);
  } catch (err) { next(err); }
}

export async function registrarVista(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    await service.registrarVista(id, req.user.sub);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function listarVistas(req, res, next) {
  try {
    const data = await service.listarVistas(req.user.sub);
    res.json(data);
  } catch (err) { next(err); }
}

export const crear     = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const actualizar = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const eliminar  = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const publicar  = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const agregarFoto  = (_req, res) => res.status(501).json({ message: 'Not implemented' });
export const eliminarFoto = (_req, res) => res.status(501).json({ message: 'Not implemented' });
