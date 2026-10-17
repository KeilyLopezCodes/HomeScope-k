import { apiClient } from '../../../shared/api/client';

// → { origen, radio_m, desde_cache, categorias: [{ categoria, nombre, total, puntos, error? }] }
export const obtenerPuntosInteres = (propiedadId, { radio, categorias }) =>
  apiClient(`/api/v1/geo/propiedades/${propiedadId}/puntos-interes?${new URLSearchParams({
    radio,
    categorias: categorias.join(','),
  })}`);
