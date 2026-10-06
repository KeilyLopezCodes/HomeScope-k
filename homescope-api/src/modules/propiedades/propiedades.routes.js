import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { authenticate, requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './propiedades.controller.js';

const router = Router();

// Adjunta req.user si hay token válido, pero no bloquea si no hay token
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET); } catch { /* ignorar */ }
  }
  next();
}

router.get('/',                     optionalAuth, controller.listar);
router.get('/vistas',               authenticate, controller.listarVistas);
router.get('/:id',                  optionalAuth, controller.getById);
router.post('/:id/vista',           authenticate, controller.registrarVista);
router.post('/',                    authenticate, requirePermission('propiedad.publicar'), controller.crear);
router.put('/:id',                  authenticate, controller.actualizar);
router.delete('/:id',               authenticate, controller.eliminar);
router.post('/:id/publicar',        authenticate, requirePermission('propiedad.publicar'), controller.publicar);
router.post('/:id/fotos',           authenticate, controller.agregarFoto);
router.delete('/:id/fotos/:fotoId', authenticate, controller.eliminarFoto);

export default router;
