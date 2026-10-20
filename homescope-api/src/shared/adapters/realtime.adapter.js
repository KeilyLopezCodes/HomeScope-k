import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../../config/env.js';
import { RealtimePort } from '../ports/index.js';

const sala = (usuarioId) => `usuario:${usuarioId}`;

// Tiempo real con Socket.io (ADR-06): el cliente solo escucha; todo lo que escribe va por REST
export class SocketIoRealtimeAdapter extends RealtimePort {
  #io = null;

  // Crea el servidor de Socket.io sobre el servidor HTTP de la API
  iniciar(httpServer) {
    this.#io = new Server(httpServer, {
      cors: { origin: env.CORS_ORIGIN, credentials: true },
    });

    // La conexión se autentica con el access token: io(url, { auth: { token } })
    this.#io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('NO_TOKEN'));
      try {
        const { sub } = jwt.verify(token, env.JWT_ACCESS_SECRET);
        socket.data.usuarioId = sub;
        next();
      } catch {
        next(new Error('TOKEN_INVALIDO'));
      }
    });

    // Cada usuario tiene su sala; ahí le llegan sus mensajes y notificaciones en todas sus pestañas
    this.#io.on('connection', (socket) => socket.join(sala(socket.data.usuarioId)));
    return this.#io;
  }

  // Sin servidor iniciado (scripts, pruebas) no hace nada: los datos ya quedaron guardados en la BD
  async emitToUser(usuarioId, evento, datos) {
    this.#io?.to(sala(usuarioId)).emit(evento, datos);
  }
}

export const realtime = new SocketIoRealtimeAdapter();
