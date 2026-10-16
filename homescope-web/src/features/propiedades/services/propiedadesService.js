import { apiClient } from '../../../shared/api/client';

// Catálogo público: solo propiedades publicadas → { data, total, page, pageSize }
export const listarPropiedades = ({ page = 1, pageSize = 12 } = {}) =>
  apiClient(`/api/v1/propiedades?${new URLSearchParams({ page, pageSize })}`);

// Ficha: el backend responde 404 si no existe o si no está publicada (salvo dueño y admin)
export const obtenerPropiedad = (id) => apiClient(`/api/v1/propiedades/${id}`);

// Historial de vistas del usuario autenticado (el backend ignora al dueño)
export const registrarVista = (id, origen = 'catalogo') =>
  apiClient(`/api/v1/propiedades/${id}/vista`, { method: 'POST', body: JSON.stringify({ origen }) });
