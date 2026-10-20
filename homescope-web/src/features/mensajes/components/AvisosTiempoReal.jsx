import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../../shared/components/ui';
import { useEventoSocket } from '../../../shared/realtime/SocketProvider';
import { CLAVES, agregarMensajeEnCache } from '../hooks/useMensajeria';
import { rutaDeNotificacion } from '../utils/notificaciones';

// Escucha global de Socket.io (montada una vez en App): mantiene al día los datos en caché
// y muestra un aviso cuando llega un mensaje nuevo. No dibuja nada propio.
export default function AvisosTiempoReal() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Mensaje de cualquier conversación del usuario: se agrega al chat si está cargado
  useEventoSocket('mensaje:nuevo', (mensaje) => {
    agregarMensajeEnCache(queryClient, mensaje);
    queryClient.invalidateQueries({ queryKey: [...CLAVES.conversaciones, 'lista'] });
  });

  useEventoSocket('notificacion:nueva', (notificacion) => {
    queryClient.invalidateQueries({ queryKey: CLAVES.notificaciones });
    // Visita nueva, confirmada, reprogramada o cancelada: la lista de visitas y los horarios libres cambiaron
    if (notificacion.referencia_tipo === 'visita') {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
      queryClient.invalidateQueries({ queryKey: ['horarios'] });
    }

    // Si ya está viendo esa conversación no hace falta avisar: el mensaje aparece en el chat
    const ruta = rutaDeNotificacion(notificacion);
    if (ruta && pathname === ruta && notificacion.referencia_tipo === 'conversacion') return;

    toast(
      <button
        type="button"
        onClick={() => ruta && navigate(ruta)}
        className="block w-full text-left focus-visible:outline-none"
      >
        <span className="block min-w-0">
          <span className="block font-semibold">{notificacion.titulo}</span>
          <span className="line-clamp-2 block text-secondary-600">{notificacion.contenido}</span>
          {ruta && (
            <span className="mt-1 block text-xs font-medium text-primary-600">
              {notificacion.referencia_tipo === 'visita' ? 'Ver visitas' : 'Abrir conversación'}
            </span>
          )}
        </span>
      </button>,
      'info',
      7000,
    );
  });

  return null;
}
