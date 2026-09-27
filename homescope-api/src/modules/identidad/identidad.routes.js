import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './identidad.controller.js';

const router = Router();

// Rutas públicas
router.post('/registro', controller.registro);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/recuperar', controller.solicitarRecuperacion);
router.post('/recuperar/:token', controller.resetPassword);

// Rutas protegidas
router.post('/logout', authenticate, controller.logout);
router.get('/perfil', authenticate, controller.getPerfil);
router.put('/perfil', authenticate, controller.updatePerfil);

export default router;
