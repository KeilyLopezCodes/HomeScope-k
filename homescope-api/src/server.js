import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { iniciarTrabajos, detenerTrabajos } from './jobs/index.js';

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
});

// TODO: Configurar autenticación de Socket.io y salas por usuario (sección 10.3)
io.on('connection', (_socket) => {});

httpServer.listen(env.PORT, () => {
  console.log(`API corriendo en puerto ${env.PORT}`);
});

// Trabajos en segundo plano (ADR-05). Si la cola no arranca, la API sigue respondiendo:
// los índices quedan "en cálculo" hasta que se recalculen.
iniciarTrabajos().catch((err) => {
  console.error('No se pudieron iniciar los trabajos en segundo plano:', err.message);
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.once(senal, async () => {
    await detenerTrabajos().catch(() => {});
    process.exit(0);
  });
}
