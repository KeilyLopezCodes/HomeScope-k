import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { UPLOADS_DIR } from './shared/adapters/storage/index.js';
import { imagenesOptimizadas } from './shared/middleware/imagenesOptimizadas.js';

// Módulos
import identidadRoutes from './modules/identidad/identidad.routes.js';
import propiedadesRoutes from './modules/propiedades/propiedades.routes.js';
import favoritosRoutes from './modules/favoritos/favoritos.routes.js';
import geoIndiceRoutes from './modules/geo-indice/geo-indice.routes.js';
import busquedaRoutes from './modules/busqueda/busqueda.routes.js';
import comunicacionRoutes from './modules/comunicacion/comunicacion.routes.js';
import notificacionesRoutes from './modules/comunicacion/notificaciones.routes.js';
import { disponibilidadRouter, horariosRouter, visitasRouter } from './modules/agenda/agenda.routes.js';
import { resenasRouter, vendedoresRouter, comentariosZonaRouter } from './modules/reputacion/reputacion.routes.js';
import moderacionRoutes, { reportesRouter, verificacionesRouter } from './modules/moderacion/moderacion.routes.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src':  ["'self'", "'unsafe-inline'"],
      'img-src':     ["'self'", 'data:', 'https://validator.swagger.io'],
    },
  },
}));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Archivos subidos con la estrategia de storage local. CORP cross-origin para que el
// frontend (otro origen) pueda mostrarlas; helmet por defecto lo restringe a same-origin.
// Con ?w=&f=&q= se sirven optimizadas (carrusel de destacadas); sin parámetros, el original
app.use('/uploads', imagenesOptimizadas(UPLOADS_DIR));
app.use('/uploads', express.static(UPLOADS_DIR, {
  index: false,
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'ok', db: 'error' });
  }
});

// Rutas
app.use('/api/v1/auth', identidadRoutes);
app.use('/api/v1/propiedades', propiedadesRoutes);
app.use('/api/v1/favoritos', favoritosRoutes);
app.use('/api/v1/geo', geoIndiceRoutes);
app.use('/api/v1/busqueda', busquedaRoutes);
app.use('/api/v1/conversaciones', comunicacionRoutes);
app.use('/api/v1/notificaciones', notificacionesRoutes);
// Agenda: tres recursos (disponibilidad del vendedor, horarios libres de una propiedad y visitas)
app.use('/api/v1/disponibilidad', disponibilidadRouter);
app.use('/api/v1/propiedades/:id/horarios', horariosRouter);
app.use('/api/v1/visitas', visitasRouter);
app.use('/api/v1/resenas', resenasRouter);
app.use('/api/v1/vendedores', vendedoresRouter);
app.use('/api/v1/propiedades/:id/comentarios-zona', comentariosZonaRouter);
app.use('/api/v1/reportes', reportesRouter);
app.use('/api/v1/verificaciones', verificacionesRouter);
app.use('/api/v1/admin', moderacionRoutes);

app.use(errorHandler);

export default app;
