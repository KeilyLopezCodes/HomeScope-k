import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

// Módulos
import identidadRoutes from './modules/identidad/identidad.routes.js';
import propiedadesRoutes from './modules/propiedades/propiedades.routes.js';
import geoIndiceRoutes from './modules/geo-indice/geo-indice.routes.js';
import busquedaRoutes from './modules/busqueda/busqueda.routes.js';
import comunicacionRoutes from './modules/comunicacion/comunicacion.routes.js';
import agendaRoutes from './modules/agenda/agenda.routes.js';
import reputacionRoutes from './modules/reputacion/reputacion.routes.js';
import moderacionRoutes from './modules/moderacion/moderacion.routes.js';

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
app.use('/api/v1/geo', geoIndiceRoutes);
app.use('/api/v1/busqueda', busquedaRoutes);
app.use('/api/v1/conversaciones', comunicacionRoutes);
app.use('/api/v1/agenda', agendaRoutes);
app.use('/api/v1/resenas', reputacionRoutes);
app.use('/api/v1/admin', moderacionRoutes);

app.use(errorHandler);

export default app;
