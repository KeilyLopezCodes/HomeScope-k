import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
});

// TODO: Configurar autenticación de Socket.io y salas por usuario (sección 10.3)
io.on('connection', (_socket) => {});

// TODO: Inicializar pg-boss (ADR-05)

httpServer.listen(env.PORT, () => {
  console.log(`API corriendo en puerto ${env.PORT}`);
});
