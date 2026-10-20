import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  enviarMensaje, listarConversaciones, listarNotificaciones,
  marcarConversacionLeida, marcarNotificacion, obtenerMensajes,
} from '../services/mensajesService';

export const CLAVES = {
  conversaciones: ['conversaciones'],
  mensajes:       (id) => ['conversaciones', String(id), 'mensajes'],
  notificaciones: ['notificaciones'],
};

const POR_PAGINA = 30;

export function useConversaciones({ enabled = true } = {}) {
  return useQuery({
    queryKey: [...CLAVES.conversaciones, 'lista'],
    queryFn:  () => listarConversaciones(),
    enabled,
  });
}

// Mensajes de una conversación en páginas, del más reciente al más antiguo.
// "Cargar anteriores" pide la página siguiente.
export function useMensajes(conversacionId) {
  return useInfiniteQuery({
    queryKey: CLAVES.mensajes(conversacionId),
    queryFn:  ({ pageParam }) => obtenerMensajes(conversacionId, { page: pageParam, pageSize: POR_PAGINA }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.page * ultima.pageSize < ultima.total ? ultima.page + 1 : undefined),
    enabled: Boolean(conversacionId),
    retry: (intentos, error) => ![400, 404].includes(error?.status) && intentos < 2,
  });
}

// Agrega un mensaje al principio de la primera página (la más reciente), sin duplicarlo:
// el mismo mensaje llega por la respuesta del POST y por Socket.io
export function agregarMensajeEnCache(queryClient, mensaje) {
  queryClient.setQueryData(CLAVES.mensajes(mensaje.conversacion_id), (datos) => {
    if (!datos) return datos;
    if (datos.pages.some((p) => p.data.some((m) => m.id === mensaje.id))) return datos;
    const [primera, ...resto] = datos.pages;
    return { ...datos, pages: [{ ...primera, data: [mensaje, ...primera.data], total: primera.total + 1 }, ...resto] };
  });
}

export function useEnviarMensaje(conversacionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contenido) => enviarMensaje(conversacionId, contenido),
    onSuccess: (mensaje) => {
      agregarMensajeEnCache(queryClient, mensaje);
      queryClient.invalidateQueries({ queryKey: [...CLAVES.conversaciones, 'lista'] });
    },
  });
}

export function useMarcarLeida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: marcarConversacionLeida,
    onSuccess: ({ mensajes_marcados }) => {
      if (!mensajes_marcados) return;
      queryClient.invalidateQueries({ queryKey: [...CLAVES.conversaciones, 'lista'] });
      queryClient.invalidateQueries({ queryKey: CLAVES.notificaciones });
    },
  });
}

// Las 8 más recientes y el total sin leer (para la campana)
export function useNotificaciones({ enabled = true } = {}) {
  return useQuery({
    queryKey: CLAVES.notificaciones,
    queryFn:  () => listarNotificaciones({ pageSize: 8 }),
    enabled,
  });
}

export function useMarcarNotificacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, leida = true }) => marcarNotificacion(id, leida),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVES.notificaciones }),
  });
}
