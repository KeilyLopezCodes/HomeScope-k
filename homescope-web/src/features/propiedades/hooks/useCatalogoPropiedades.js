import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listarPropiedades } from '../services/propiedadesService';

export function useCatalogoPropiedades({ page, pageSize }) {
  return useQuery({
    queryKey: ['propiedades', 'catalogo', { page, pageSize }],
    queryFn:  () => listarPropiedades({ page, pageSize }),
    // Mantiene la página anterior visible mientras carga la siguiente
    placeholderData: keepPreviousData,
  });
}
