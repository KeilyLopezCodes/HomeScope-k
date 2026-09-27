import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './comunicacion.controller.js';
const router = Router();
router.get('/', authenticate, controller.listar);
router.post('/', authenticate, controller.crear);
router.get('/:id/mensajes', authenticate, controller.getMensajes);
router.post('/:id/mensajes', authenticate, controller.enviarMensaje);
export default router;
