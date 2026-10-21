import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { env } from '../../config/env.js';
import { RealtimePort } from '../ports/index.js';

const sala = (usuarioId) => `usuario:${usuarioId}`;

// Tiempo real con Socket.io (ADR-06): el cliente solo escucha; todo lo que escribe va por REST
export class SocketIoRealtimeAdapter extends RealtimePort {
  #io = null;

  // Crea el servidor de Socket.io sobre el servidor HTTP de la API.
  // cuentaActiva(usuarioId): opcional, rechaza la conexión de cuentas suspendidas
  iniciar(httpServer, { cuentaActiva = async () => true } = {}) {
    this.#io = new Server(httpServer, {
      cors: { origin: env.CORS_ORIGIN, credentials: true },
    });

    // La conexión se autentica con el access token: io(url, { auth: { token } })
    this.#io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('NO_TOKEN'));
      let sub;
      try {
        ({ sub } = jwt.verify(token, env.JWT_ACCESS_SECRET));
      } catch {
        return next(new Error('TOKEN_INVALIDO'));
      }
      try {
        if (!(await cuentaActiva(sub))) return next(new Error('CUENTA_SUSPENDIDA'));
      } catch {
        return next(new Error('ERROR_SERVIDOR'));
      }
      socket.data.usuarioId = sub;
      next();
    });

    // Cada usuario tiene su sala; ahí le llegan sus mensajes y notificaciones en todas sus pestañas
    this.#io.on('connection', (socket) => socket.join(sala(socket.data.usuarioId)));
    return this.#io;
  }

  // Sin servidor iniciado (scripts, pruebas) no hace nada: los datos ya quedaron guardados en la BD
  async emitToUser(usuarioId, evento, datos) {
    this.#io?.to(sala(usuarioId)).emit(evento, datos);
  }

  // Cierra todas las conexiones del usuario (cuenta suspendida)
  async desconectarUsuario(usuarioId) {
    this.#io?.in(sala(usuarioId)).disconnectSockets(true);
  }
}

export const realtime = new SocketIoRealtimeAdapter();
