import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import {
  obtenerEstadisticas, listarPropiedades, listarUsuarios, listarReportes, listarAcciones,
  ejecutarAccion, resolverReporte,
} from '../services/adminService';

// Las consultas esperan a que se restaure la sesión: al recargar la página, el token llega con el refresh
const consulta = (clave, fn) => (filtros) => {
  const { sesionVerificada } = useAuth();
  return useQuery({
    queryKey: ['admin', clave, filtros],
    queryFn:  () => fn(filtros),
    enabled:  sesionVerificada,
    // Al cambiar de filtro o de página se conserva la lista anterior mientras carga
    placeholderData: keepPreviousData,
  });
};

export const useEstadisticasPlataforma = consulta('estadisticas', obtenerEstadisticas);
export const usePropiedadesAdmin       = consulta('propiedades', listarPropiedades);
export const useUsuariosAdmin          = consulta('usuarios', listarUsuarios);
export const useReportesAdmin          = consulta('reportes', listarReportes);
export const useAccionesAdmin          = consulta('acciones', listarAcciones);

// Tras una acción cambian las listas, los conteos, las estadísticas y el historial del panel,
// y también el catálogo y las fichas (una publicación pausada o eliminada deja de verse)
function useInvalidarTrasModerar() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['propiedades'] });
  };
}

export function useEjecutarAccion() {
  const invalidar = useInvalidarTrasModerar();
  return useMutation({ mutationFn: ejecutarAccion, onSuccess: invalidar });
}

export function useResolverReporte() {
  const invalidar = useInvalidarTrasModerar();
  return useMutation({ mutationFn: ({ id, ...datos }) => resolverReporte(id, datos), onSuccess: invalidar });
}
