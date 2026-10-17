import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../shared/middleware/auth.js';
import * as controller from './geo-indice.controller.js';

const router = Router();

// Cada consulta nueva cuesta hasta 6 llamadas pagadas a Google Places
const limitePlaces = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'DEMASIADAS_SOLICITUDES', message: 'Demasiadas consultas de puntos de interés. Espera un minuto.', details: [] } },
});

/**
 * @openapi
 * tags:
 *   name: Geo e índice
 *   description: Puntos de interés cercanos e Índice de Conveniencia
 */

/**
 * @openapi
 * /geo/puntos-interes:
 *   get:
 *     tags: [Geo e índice]
 *     summary: Puntos de interés cercanos a una coordenada, agrupados por categoría
 *     description: |
 *       Consulta Google Places (Nearby Search) por cada categoría del Índice de Conveniencia
 *       (educación, salud, comercio, transporte, seguridad y áreas verdes) y devuelve hasta 20 lugares
 *       por categoría, del más cercano al más lejano.
 *
 *       - `distancia_m` es la distancia en línea recta.
 *       - `tiempo_estimado` aplica un factor de rodeo de 1.3 por calles: 80 m/min caminando y 400 m/min en auto.
 *       - Caché: a Google siempre se le consulta un radio de 2 km por categoría y se guarda 24 horas en
 *         memoria por coordenada (redondeada a ~11 m) y categoría. Los radios de 500 m y 1 km se filtran
 *         de ese mismo resultado, así que una segunda consulta con la misma coordenada se responde
 *         desde caché aunque cambie el radio o las categorías. `desde_cache` y el encabezado `X-Cache`
 *         (HIT/MISS) indican si hubo que llamar a Google.
 *       - Límite: 20 consultas por minuto.
 *       - Si una categoría falla, viene con `error: true` y lista vacía; si fallan todas, responde 502.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number, minimum: -90, maximum: 90, example: 14.6339 }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number, minimum: -180, maximum: 180, example: -89.9892 }
 *       - in: query
 *         name: radio
 *         description: Radio de búsqueda en metros. Cualquier otro valor responde 422.
 *         schema: { type: integer, enum: [500, 1000, 2000], default: 2000 }
 *       - in: query
 *         name: categorias
 *         description: |
 *           Lista separada por comas; la respuesta trae solo esas categorías. Sin el parámetro, todas.
 *           Valores: educacion, salud, comercio, transporte, seguridad, areas_verdes
 *         schema: { type: string, example: "educacion,salud" }
 *     responses:
 *       200:
 *         description: Puntos de interés agrupados por categoría.
 *         headers:
 *           X-Cache:
 *             description: HIT si toda la respuesta salió de caché, MISS si se consultó a Google
 *             schema: { type: string, enum: [HIT, MISS] }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 origen:  { type: object, properties: { lat: { type: number }, lng: { type: number } } }
 *                 radio_m: { type: integer, example: 2000 }
 *                 desde_cache: { type: boolean, description: "true si no hubo que llamar a Google" }
 *                 categorias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       categoria: { type: string, example: educacion }
 *                       nombre:    { type: string, example: Educación }
 *                       total:     { type: integer }
 *                       error:     { type: boolean, description: "Solo si la consulta de esta categoría falló" }
 *                       puntos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             place_id:    { type: string }
 *                             nombre:      { type: string, example: "Escuela Oficial Urbana de Niñas" }
 *                             direccion:   { type: string, nullable: true }
 *                             latitud:     { type: number }
 *                             longitud:    { type: number }
 *                             tipo:        { type: string, example: school }
 *                             distancia_m: { type: integer, example: 350 }
 *                             tiempo_estimado:
 *                               type: object
 *                               properties:
 *                                 caminando_min: { type: integer, example: 6 }
 *                                 en_auto_min:   { type: integer, example: 1 }
 *                 calculo:
 *                   type: object
 *                   description: Cómo se calcularon la distancia y el tiempo
 *       401:
 *         description: Token requerido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       422:
 *         description: Coordenada inválida, radio distinto de 500/1000/2000 o categoría inexistente.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Se superó el límite de consultas por minuto.
 *       502:
 *         description: Google Places no respondió o rechazó la consulta.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/puntos-interes', authenticate, limitePlaces, controller.buscarPuntosInteres);

router.get('/propiedades/:id/indice', controller.getIndice);
router.get('/propiedades/:id/puntos-interes', controller.getPuntosInteres);

export default router;
