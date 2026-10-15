import { apiClient } from '../../../shared/api/client';

// Catálogo público: solo propiedades publicadas → { data, total, page, pageSize }
export const listarPropiedades = ({ page = 1, pageSize = 12 } = {}) =>
  apiClient(`/api/v1/propiedades?${new URLSearchParams({ page, pageSize })}`);
