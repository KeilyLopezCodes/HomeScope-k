import { Router } from 'express';
import * as controller from './geo-indice.controller.js';
const router = Router();
router.get('/propiedades/:id/indice', controller.getIndice);
router.get('/propiedades/:id/puntos-interes', controller.getPuntosInteres);
export default router;
