import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import { requirePermission } from '../../shared/middleware/auth.js';
import * as controller from './propiedades.controller.js';

const router = Router();

router.get('/', controller.listar);
router.get('/:id', controller.getById);
router.post('/', authenticate, requirePermission('propiedad.publicar'), controller.crear);
router.put('/:id', authenticate, controller.actualizar);
router.delete('/:id', authenticate, controller.eliminar);
router.post('/:id/publicar', authenticate, requirePermission('propiedad.publicar'), controller.publicar);
router.post('/:id/fotos', authenticate, controller.agregarFoto);
router.delete('/:id/fotos/:fotoId', authenticate, controller.eliminarFoto);

export default router;
