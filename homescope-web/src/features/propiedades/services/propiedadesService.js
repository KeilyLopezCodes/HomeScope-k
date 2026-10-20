import { apiClient } from '../../../shared/api/client';

// Catálogo público de publicadas, con búsqueda por texto y filtros → { data, total, page, pageSize, filtros }
// params: URLSearchParams con los filtros (q, modalidad, tipo, precio_min…), ver features/busqueda
export const listarPropiedades = ({ page = 1, pageSize = 12, params = new URLSearchParams() } = {}) => {
  const query = new URLSearchParams(params);
  query.set('page', page);
  query.set('pageSize', pageSize);
  return apiClient(`/api/v1/propiedades?${query}`);
};

// Ficha: el backend responde 404 si no existe o si no está publicada (salvo dueño y admin)
export const obtenerPropiedad = (id) => apiClient(`/api/v1/propiedades/${id}`);

// Historial de vistas del usuario autenticado (el backend ignora al dueño)
export const registrarVista = (id, origen = 'catalogo') =>
  apiClient(`/api/v1/propiedades/${id}/vista`, { method: 'POST', body: JSON.stringify({ origen }) });
