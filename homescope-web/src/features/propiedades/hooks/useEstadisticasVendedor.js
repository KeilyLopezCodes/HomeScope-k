import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { obtenerEstadisticas } from '../services/propiedadesService';

export function useEstadisticasVendedor({ dias, propiedadId = null, enabled = true }) {
  return useQuery({
    queryKey: ['propiedades', 'mias', 'estadisticas', dias, propiedadId],
    queryFn:  () => obtenerEstadisticas({ dias, propiedadId }),
    enabled,
    // Al cambiar el período o la propiedad se conserva la vista anterior mientras carga
    placeholderData: keepPreviousData,
    retry: (intentos, error) => ![404, 422].includes(error?.status) && intentos < 2,
  });
}
