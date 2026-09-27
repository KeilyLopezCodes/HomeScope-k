import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
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

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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
