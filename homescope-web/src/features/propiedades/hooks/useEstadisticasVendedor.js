import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { obtenerEstadisticas } from '../services/propiedadesService';
import { useAuth } from '../../auth';

// Espera a que se restaure la sesión: al recargar la página, el token llega con el refresh
export function useEstadisticasVendedor({ dias, propiedadId = null, enabled = true }) {
  const { sesionVerificada } = useAuth();
  return useQuery({
    queryKey: ['propiedades', 'mias', 'estadisticas', dias, propiedadId],
    queryFn:  () => obtenerEstadisticas({ dias, propiedadId }),
    enabled:  enabled && sesionVerificada,
    // Al cambiar el período o la propiedad se conserva la vista anterior mientras carga
    placeholderData: keepPreviousData,
    retry: (intentos, error) => ![404, 422].includes(error?.status) && intentos < 2,
  });
}
