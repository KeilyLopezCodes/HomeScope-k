import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './favoritos.controller.js';

const router = Router();

router.get('/',                    authenticate, controller.listar);
router.post('/:propiedadId',       authenticate, controller.agregar);
router.delete('/:propiedadId',     authenticate, controller.eliminar);

export default router;
