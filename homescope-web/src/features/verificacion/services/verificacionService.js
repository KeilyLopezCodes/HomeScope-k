import { apiClient, getAccessToken, refreshToken } from '../../../shared/api/client';

// Mismos límites que el backend (DOCUMENTO_CONFIG en moderacion.schemas.js)
export const DOCUMENTO_CONFIG = {
  maxBytes: 5 * 1024 * 1024,
  tipos:    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};
export const TIPOS_DOCUMENTO = {
  dpi:       'DPI',
  pasaporte: 'Pasaporte',
  licencia:  'Licencia de conducir',
};

// → { verificado, solicitud: { id, estado, tipo_documento, fecha_solicitud, fecha_revision, motivo_rechazo } | null }
export const obtenerMiVerificacion = () => apiClient('/api/v1/verificaciones/mia');

export function enviarVerificacion({ tipo_documento, archivo }) {
  const form = new FormData();
  form.append('tipo_documento', tipo_documento);
  form.append('documento', archivo);
  return apiClient('/api/v1/verificaciones', { method: 'POST', body: form });
}

// ── Administrador ────────────────────────────────────────────────────────────
export const listarVerificaciones = ({ estado, page, pageSize }) =>
  apiClient(`/api/v1/admin/verificaciones?${new URLSearchParams({ ...(estado && { estado }), page, pageSize })}`);

export const resolverVerificacion = (id, datos) =>
  apiClient(`/api/v1/admin/verificaciones/${id}`, { method: 'PUT', body: JSON.stringify(datos) });

// El documento es un archivo privado: se descarga con el token y se muestra como blob (no tiene URL pública)
export async function descargarDocumento(id) {
  const pedir = () => fetch(`${import.meta.env.VITE_API_URL}/api/v1/admin/verificaciones/${id}/documento`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    credentials: 'include',
  });
  let res = await pedir();
  if (res.status === 401) { await refreshToken(); res = await pedir(); }
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => ({}));
    throw Object.assign(new Error(cuerpo.error?.message ?? 'No se pudo cargar el documento'), { status: res.status });
  }
  return res.blob();
}
