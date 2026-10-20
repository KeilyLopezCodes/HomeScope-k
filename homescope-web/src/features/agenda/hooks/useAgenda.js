import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { actualizarVisita, listarVisitas, obtenerHorarios, solicitarVisita } from '../services/agendaService';

export const CLAVES_AGENDA = {
  horarios: (propiedadId) => ['horarios', String(propiedadId)],
  visitas:  ['visitas'],
};

export function useHorarios(propiedadId, { enabled = true } = {}) {
  return useQuery({
    queryKey: CLAVES_AGENDA.horarios(propiedadId),
    queryFn:  () => obtenerHorarios(propiedadId, 30),
    enabled:  enabled && Boolean(propiedadId),
    // Otros compradores toman horarios: se vuelve a pedir al abrir de nuevo el calendario
    staleTime: 0,
  });
}

export function useVisitas(filtros) {
  return useQuery({
    queryKey: [...CLAVES_AGENDA.visitas, filtros],
    queryFn:  () => listarVisitas(filtros),
    placeholderData: keepPreviousData,
  });
}

// Solicitudes que esperan respuesta del vendedor (para el contador de la pestaña)
export function usePendientesVendedor({ enabled = true } = {}) {
  return useQuery({
    queryKey: [...CLAVES_AGENDA.visitas, 'pendientes'],
    queryFn:  () => listarVisitas({ rol: 'vendedor', estado: 'solicitada', pageSize: 1 }),
    enabled,
    select: (d) => d.total,
  });
}

// Tras solicitar o cambiar una visita: refrescar las listas y los horarios libres de esa propiedad
function useRefrescarAgenda() {
  const queryClient = useQueryClient();
  return (propiedadId) => {
    queryClient.invalidateQueries({ queryKey: CLAVES_AGENDA.visitas });
    if (propiedadId) queryClient.invalidateQueries({ queryKey: CLAVES_AGENDA.horarios(propiedadId) });
  };
}

export function useSolicitarVisita() {
  const refrescar = useRefrescarAgenda();
  return useMutation({
    mutationFn: solicitarVisita,
    onSettled: (_d, _e, { propiedadId }) => refrescar(propiedadId),
  });
}

export function useActualizarVisita() {
  const refrescar = useRefrescarAgenda();
  return useMutation({
    mutationFn: ({ visita, cambio }) => actualizarVisita(visita.id, cambio),
    onSettled: (_d, _e, { visita }) => refrescar(visita.propiedad.id),
  });
}
