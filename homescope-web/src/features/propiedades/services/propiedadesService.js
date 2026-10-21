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

// ── Mis propiedades (vendedor) ───────────────────────────────────────────────

// estado: todas | borrador | publicado | pausado | cerrada → { data, total, page, pageSize, conteos }
export const listarMisPropiedades = ({ estado = 'todas', page = 1, pageSize = 10 } = {}) =>
  apiClient(`/api/v1/propiedades/mias?${new URLSearchParams({ estado, page, pageSize })}`);

export const crearPropiedad = (campos) =>
  apiClient('/api/v1/propiedades', { method: 'POST', body: JSON.stringify(campos) });

export const actualizarPropiedad = (id, campos) =>
  apiClient(`/api/v1/propiedades/${id}`, { method: 'PUT', body: JSON.stringify(campos) });

export const publicarPropiedad = (id) =>
  apiClient(`/api/v1/propiedades/${id}/publicar`, { method: 'POST' });

// pausado, publicado (reactivar), vendido o alquilado
export const cambiarEstadoPropiedad = (id, estado) =>
  apiClient(`/api/v1/propiedades/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) });

export const renovarPropiedad = (id) =>
  apiClient(`/api/v1/propiedades/${id}/renovar`, { method: 'POST' });

export const eliminarPropiedad = (id) =>
  apiClient(`/api/v1/propiedades/${id}`, { method: 'DELETE' });

// Panel del vendedor: vistas, favoritos y mensajes de los últimos `dias` días (7, 30 o 90),
// de todas sus propiedades o de una → { periodo, resumen, serie, propiedades, promedio_vistas_dia }
export const obtenerEstadisticas = ({ dias = 30, propiedadId = null } = {}) => {
  const query = new URLSearchParams({ dias });
  if (propiedadId) query.set('propiedad_id', propiedadId);
  return apiClient(`/api/v1/propiedades/mias/estadisticas?${query}`);
};
