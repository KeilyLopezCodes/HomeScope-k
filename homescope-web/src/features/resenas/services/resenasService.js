import { apiClient } from '../../../shared/api/client';

// Perfil público → { id, nombre, apellido, foto_url, miembro_desde, verificado, propiedades_publicadas,
//                    calificacion: { promedio, total, distribucion } }
export const obtenerPerfilVendedor = (vendedorId) => apiClient(`/api/v1/vendedores/${vendedorId}`);

export const listarResenasVendedor = (vendedorId, { page = 1, pageSize = 5 } = {}) =>
  apiClient(`/api/v1/vendedores/${vendedorId}/resenas?${new URLSearchParams({ page, pageSize })}`);

// → { puede_resenar, motivo, mensaje, por: ['contacto' | 'visita'], resena? }
export const consultarElegibilidad = (propiedadId) =>
  apiClient(`/api/v1/resenas/elegibilidad?${new URLSearchParams({ propiedad_id: propiedadId })}`);

export const crearResena = ({ propiedadId, calificacion, comentario }) =>
  apiClient('/api/v1/resenas', {
    method: 'POST',
    body: JSON.stringify({ propiedad_id: propiedadId, calificacion, ...(comentario && { comentario }) }),
  });
