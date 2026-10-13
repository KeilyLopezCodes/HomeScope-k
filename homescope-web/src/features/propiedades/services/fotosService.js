import { apiClient } from '../../../shared/api/client';

// Mismos límites que el backend (FOTOS_CONFIG en propiedades.schemas.js)
export const FOTOS_CONFIG = {
  maxPorPropiedad: 10,
  maxBytes:        5 * 1024 * 1024,
  tipos:           ['image/jpeg', 'image/png', 'image/webp'],
};

// Valida un archivo antes de subirlo; devuelve el mensaje de error o null
export function validarArchivo(file) {
  if (!FOTOS_CONFIG.tipos.includes(file.type))
    return `"${file.name}": formato no permitido (usa JPG, PNG o WEBP)`;
  if (file.size > FOTOS_CONFIG.maxBytes)
    return `"${file.name}": supera el máximo de ${FOTOS_CONFIG.maxBytes / (1024 * 1024)} MB`;
  return null;
}

// files: File[] en el orden deseado; indicePortada: índice dentro de files
export function subirFotos(propiedadId, files, indicePortada) {
  const form = new FormData();
  files.forEach((f) => form.append('fotos', f));
  if (indicePortada !== undefined && indicePortada !== null) form.append('portada', String(indicePortada));
  return apiClient(`/api/v1/propiedades/${propiedadId}/fotos`, { method: 'POST', body: form });
}

export function reordenarFotos(propiedadId, orden) {
  return apiClient(`/api/v1/propiedades/${propiedadId}/fotos/orden`, {
    method: 'PUT',
    body: JSON.stringify({ orden }),
  });
}

export function definirPortada(propiedadId, fotoId) {
  return apiClient(`/api/v1/propiedades/${propiedadId}/fotos/${fotoId}/portada`, { method: 'PATCH' });
}

export function eliminarFoto(propiedadId, fotoId) {
  return apiClient(`/api/v1/propiedades/${propiedadId}/fotos/${fotoId}`, { method: 'DELETE' });
}
