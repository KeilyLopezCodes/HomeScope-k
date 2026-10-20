import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken, refreshToken } from '../api/client';
import { useAuth } from '../../features/auth';

const SocketContext = createContext({ socket: null, conectado: false });

// Conexión de Socket.io de la sesión (arquitectura §10.3). El cliente solo escucha:
// todo lo que escribe va por REST. Se conecta al iniciar sesión y se cierra al salir.
export function SocketProvider({ children }) {
  const { user, sesionVerificada } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conectado, setConectado] = useState(false);
  const renovando = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !sesionVerificada) return;

    const s = io(import.meta.env.VITE_API_URL, {
      // Función: en cada reconexión toma el token vigente (el access token dura 15 minutos)
      auth: (cb) => cb({ token: getAccessToken() }),
      withCredentials: true,
    });

    s.on('connect', () => { renovando.current = false; setConectado(true); });
    s.on('disconnect', () => setConectado(false));
    // Token vencido o ausente: se renueva una vez con la cookie de refresh y se reintenta
    s.on('connect_error', async (err) => {
      if (!['TOKEN_INVALIDO', 'NO_TOKEN'].includes(err.message) || renovando.current) return;
      renovando.current = true;
      try {
        await refreshToken();
        s.connect();
      } catch {
        s.disconnect(); // la sesión expiró: la app pedirá iniciar sesión en la siguiente acción
      }
    });

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setConectado(false);
      // Al cerrar o cambiar de sesión, los mensajes y notificaciones del usuario anterior no deben quedar en caché
      queryClient.removeQueries({ queryKey: ['conversaciones'] });
      queryClient.removeQueries({ queryKey: ['notificaciones'] });
    };
  }, [user?.id, sesionVerificada]);

  return <SocketContext.Provider value={{ socket, conectado }}>{children}</SocketContext.Provider>;
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
