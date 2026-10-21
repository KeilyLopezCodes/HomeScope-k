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

// Lleva al servidor las fotos del formulario cuando la propiedad ya existe (borrador del servidor o edición).
// fotos: [{ key, id?, file?, preview }] en el orden final (con id = ya está en el servidor; con file = nueva)
// portadaKey: key de la portada; eliminadas: ids de fotos del servidor que se quitaron
// Devuelve las fotos con su id del servidor, para no volver a subirlas si algo falla después
export async function sincronizarFotos(propiedadId, fotos, portadaKey, eliminadas = []) {
  // Primero se borran: así las nuevas caben en el máximo de fotos por propiedad
  for (const fotoId of eliminadas) await eliminarFoto(propiedadId, fotoId);

  const ids = new Map(fotos.filter((f) => f.id).map((f) => [f.key, f.id]));
  const nuevas = fotos.filter((f) => !f.id);
  if (nuevas.length) {
    // El backend las agrega al final, en el orden enviado, y responde con todas las fotos
    const todas = await subirFotos(propiedadId, nuevas.map((f) => f.file));
    todas.slice(-nuevas.length).forEach((foto, i) => ids.set(nuevas[i].key, foto.id));
  }

  const orden = fotos.map((f) => ids.get(f.key));
  if (orden.length) {
    await reordenarFotos(propiedadId, orden);
    await definirPortada(propiedadId, ids.get(portadaKey) ?? orden[0]);
  }
  return fotos.map((f) => ({ key: f.key, id: ids.get(f.key), preview: f.preview }));
}
