import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken, refreshToken } from '../api/client';
import { useAuth } from '../../features/auth';

// Estados de la conexión en tiempo real:
//   inactivo        sin sesión: no hay conexión que mantener
//   conectando      primera conexión tras iniciar sesión (no es un problema)
//   conectado       todo bien
//   reconectando    se perdió la conexión o el servidor no responde; Socket.io reintenta solo
//   sin_internet    el navegador no tiene red; se reintenta al volver
//   sesion_expirada no se pudo renovar el token: hay que iniciar sesión de nuevo
const SocketContext = createContext({ socket: null, estado: 'inactivo', conectado: false });

// Datos que llegan por Socket.io: si hubo un corte, se vuelven a pedir para no perder lo que llegó mientras tanto
const CONSULTAS_EN_TIEMPO_REAL = [['conversaciones'], ['notificaciones']];

// Conexión de Socket.io de la sesión (arquitectura §10.3). El cliente solo escucha:
// todo lo que escribe va por REST, así que enviar mensajes funciona aunque el socket esté caído.
export function SocketProvider({ children }) {
  const { user, sesionVerificada } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState(null);
  const [estado, setEstado] = useState('inactivo');
  const renovando = useRef(false);

  useEffect(() => {
    if (!user || !sesionVerificada) return;

    let conectoAntes = false;
    setEstado(navigator.onLine ? 'conectando' : 'sin_internet');

    const s = io(import.meta.env.VITE_API_URL, {
      // Función: en cada reconexión toma el token vigente (el access token dura 15 minutos)
      auth: (cb) => cb({ token: getAccessToken() }),
      withCredentials: true,
      // Reintentos indefinidos con espera creciente de 1 s a 10 s (no satura el servidor si está caído)
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    s.on('connect', () => {
      renovando.current = false;
      setEstado('conectado');
      // Reconexión tras un corte: sincronizar lo que pudo llegar mientras no había conexión
      if (conectoAntes) CONSULTAS_EN_TIEMPO_REAL.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      conectoAntes = true;
    });

    s.on('disconnect', (motivo) => {
      // 'io client disconnect' es un cierre voluntario (cerrar sesión): no es un error
      if (motivo === 'io client disconnect') return;
      setEstado(navigator.onLine ? 'reconectando' : 'sin_internet');
      // El servidor cerró la conexión a propósito: Socket.io no reintenta solo en ese caso
      if (motivo === 'io server disconnect') s.connect();
    });

    s.on('connect_error', async (err) => {
      // Cuenta suspendida por moderación: reintentar no sirve
      if (err.message === 'CUENTA_SUSPENDIDA') {
        s.disconnect();
        setEstado('sesion_expirada');
        return;
      }
      if (!['TOKEN_INVALIDO', 'NO_TOKEN'].includes(err.message)) {
        // Servidor caído o sin red: Socket.io sigue reintentando por su cuenta
        setEstado(navigator.onLine ? 'reconectando' : 'sin_internet');
        return;
      }
      // Token vencido o ausente: se renueva una vez con la cookie de refresh y se reintenta
      if (renovando.current) return;
      renovando.current = true;
      try {
        await refreshToken();
        s.connect();
      } catch {
        s.disconnect();
        setEstado('sesion_expirada');
      }
    });

    // Sin red no tiene sentido esperar al siguiente reintento: se avisa ya y se reconecta al volver
    const sinRed = () => setEstado('sin_internet');
    const conRed = () => { if (!s.connected) { setEstado('reconectando'); s.connect(); } };
    window.addEventListener('offline', sinRed);
    window.addEventListener('online', conRed);

    setSocket(s);
    return () => {
      window.removeEventListener('offline', sinRed);
      window.removeEventListener('online', conRed);
      s.disconnect();
      setSocket(null);
      setEstado('inactivo');
      // Al cerrar o cambiar de sesión, los mensajes y notificaciones del usuario anterior no deben quedar en caché
      CONSULTAS_EN_TIEMPO_REAL.forEach((queryKey) => queryClient.removeQueries({ queryKey }));
    };
  }, [user?.id, sesionVerificada]);

  return (
    <SocketContext.Provider value={{ socket, estado, conectado: estado === 'conectado' }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

// Escucha un evento mientras el componente está montado; el manejador puede cambiar entre renders
export function useEventoSocket(evento, manejador) {
  const { socket } = useSocket();
  const ref = useRef(manejador);
  ref.current = manejador;

  useEffect(() => {
    if (!socket) return;
    const escuchar = (datos) => ref.current(datos);
    socket.on(evento, escuchar);
    return () => socket.off(evento, escuchar);
  }, [socket, evento]);
}

// Mientras el tiempo real esté caído, las consultas de mensajería se refrescan solas cada 15 s.
// Con la sesión expirada no: la API también la rechazaría.
export const INTERVALO_SIN_CONEXION_MS = 15000;
export function useIntervaloRespaldo() {
  const { estado } = useSocket();
  return ['reconectando', 'sin_internet'].includes(estado) ? INTERVALO_SIN_CONEXION_MS : false;
}
