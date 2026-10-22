import { useSyncExternalStore } from 'react';

// Propiedades elegidas para comparar: hasta 4, guardadas en este navegador (sobreviven a recargar
// y se comparten entre pestañas). No requiere sesión
export const MAX_COMPARAR = 4;
const CLAVE = 'homescope_comparar';
const oyentes = new Set();

function leer() {
  try {
    const ids = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(ids) ? ids.filter(Number.isInteger).slice(0, MAX_COMPARAR) : [];
  } catch { return []; }
}

let actual = leer();
const avisar = () => oyentes.forEach((fn) => fn());

function guardar(ids) {
  actual = ids;
  try { localStorage.setItem(CLAVE, JSON.stringify(ids)); } catch { /* sin almacenamiento: solo en memoria */ }
  avisar();
}

// Otra pestaña cambió la selección
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === CLAVE) { actual = leer(); avisar(); } });
}

function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function useComparador() {
  const ids = useSyncExternalStore(suscribir, () => actual);
  return {
    ids,
    lleno:      ids.length >= MAX_COMPARAR,
    incluye:    (id) => ids.includes(id),
    // Parten de `actual` (no del render) por si se llaman dos veces seguidas. agregar devuelve false si ya hay 4
    agregar:    (id) => { if (actual.includes(id)) return true; if (actual.length >= MAX_COMPARAR) return false; guardar([...actual, id]); return true; },
    quitar:     (id) => guardar(actual.filter((x) => x !== id)),
    reemplazar: (nuevos) => guardar([...new Set(nuevos)].slice(0, MAX_COMPARAR)),
    limpiar:    () => guardar([]),
  };
}
