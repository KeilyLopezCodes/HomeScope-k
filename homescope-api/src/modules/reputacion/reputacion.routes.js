import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './reputacion.controller.js';
const router = Router();
router.get('/propiedades/:propiedadId', controller.getResenas);
router.post('/propiedades/:propiedadId', authenticate, controller.crearResena);
router.get('/zonas/:zona', controller.getComentariosZona);
router.post('/zonas/:zona', authenticate, controller.crearComentarioZona);
export default router;
