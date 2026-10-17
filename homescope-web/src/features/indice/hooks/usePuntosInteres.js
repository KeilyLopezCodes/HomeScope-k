import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { obtenerPuntosInteres } from '../services/puntosInteresService';

export function usePuntosInteres(propiedadId, { radio, categorias, enabled = true }) {
  return useQuery({
    queryKey: ['geo', 'puntos-interes', String(propiedadId), radio, categorias.join(',')],
    queryFn:  () => obtenerPuntosInteres(propiedadId, { radio, categorias }),
    enabled,
    // Al cambiar radio o filtro se siguen viendo los resultados anteriores mientras llegan los nuevos
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    // 404 (no visible) y 422 (sin coordenadas) no se arreglan reintentando
    retry: (intentos, error) => ![404, 422].includes(error?.status) && intentos < 2,
  });
}
