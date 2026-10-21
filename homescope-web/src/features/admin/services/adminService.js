import { apiClient } from '../../../shared/api/client';

// Endpoints /admin (solo administrador). Los filtros van como query params del recurso
const conFiltros = (ruta, filtros = {}) => {
  const query = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return apiClient(`/api/v1/admin/${ruta}?${query}`);
};

export const obtenerEstadisticas = (dias)   => conFiltros('estadisticas', { dias });
export const listarPropiedades   = (filtros) => conFiltros('propiedades', filtros);
export const listarUsuarios      = (filtros) => conFiltros('usuarios', filtros);
export const listarReportes      = (filtros) => conFiltros('reportes', filtros);
export const listarAcciones      = (filtros) => conFiltros('acciones', filtros);

// { accion, propiedad_id | usuario_id, motivo, reporte_id? }
export const ejecutarAccion = (datos) =>
  apiClient('/api/v1/admin/acciones', { method: 'POST', body: JSON.stringify(datos) });

// { estado, ocultar_comentario?, motivo? }
export const resolverReporte = (id, datos) =>
  apiClient(`/api/v1/admin/reportes/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
