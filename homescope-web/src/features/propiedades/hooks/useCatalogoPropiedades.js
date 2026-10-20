import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listarPropiedades } from '../services/propiedadesService';
import { escribirFiltros } from '../../busqueda';

export function useCatalogoPropiedades({ page, pageSize, filtros = {} }) {
  const params = escribirFiltros(filtros);
  return useQuery({
    queryKey: ['propiedades', 'catalogo', { page, pageSize, filtros: params.toString() }],
    queryFn:  () => listarPropiedades({ page, pageSize, params }),
    // Mantiene los resultados anteriores visibles mientras cargan los de la nueva página o filtro
    placeholderData: keepPreviousData,
  });
}
