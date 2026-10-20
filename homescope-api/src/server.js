import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { iniciarTrabajos, detenerTrabajos } from './jobs/index.js';
import { realtime } from './shared/adapters/realtime.adapter.js';

const httpServer = createServer(app);

// Socket.io autenticado con el access token y una sala por usuario (arquitectura §10.3)
realtime.iniciar(httpServer);

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
