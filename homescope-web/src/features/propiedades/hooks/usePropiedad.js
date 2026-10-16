import { useQuery } from '@tanstack/react-query';
import { obtenerPropiedad } from '../services/propiedadesService';

// La respuesta depende de quién la pide (es_dueno, es_favorito, no publicadas): el usuario va en la clave
export const propiedadKey = (id, usuarioId = null) => ['propiedades', 'detalle', String(id), usuarioId];

export function usePropiedad(id, { usuarioId = null, enabled = true } = {}) {
  return useQuery({
    queryKey: propiedadKey(id, usuarioId),
    queryFn:  () => obtenerPropiedad(id),
    enabled,
    // 400/404 no se arreglan reintentando
    retry: (intentos, error) => ![400, 404].includes(error?.status) && intentos < 2,
  });
}
