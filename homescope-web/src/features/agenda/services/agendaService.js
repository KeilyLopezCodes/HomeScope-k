import { apiClient } from '../../../shared/api/client';

const consulta = (params) => new URLSearchParams(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
);

// Horarios libres de una propiedad → { vendedor_tiene_disponibilidad, dias: [{ fecha, dia, horarios: [{ fecha_hora, hora }] }] }
export const obtenerHorarios = (propiedadId, dias = 30) =>
  apiClient(`/api/v1/propiedades/${propiedadId}/horarios?${consulta({ dias })}`);

export const solicitarVisita = ({ propiedadId, fechaHora, nota }) =>
  apiClient('/api/v1/visitas', {
    method: 'POST',
    body: JSON.stringify({ propiedad_id: propiedadId, fecha_hora: fechaHora, ...(nota && { nota }) }),
  });

// rol: 'comprador' | 'vendedor'; estado: solicitada | confirmada | reprogramada | cancelada
export const listarVisitas = ({ rol, estado, page = 1, pageSize = 10 } = {}) =>
  apiClient(`/api/v1/visitas?${consulta({ rol, estado, page, pageSize })}`);

// cambio: { estado: 'confirmada' } | { estado: 'reprogramada', fecha_hora } | { estado: 'cancelada' }
export const actualizarVisita = (id, cambio) =>
  apiClient(`/api/v1/visitas/${id}`, { method: 'PATCH', body: JSON.stringify(cambio) });
