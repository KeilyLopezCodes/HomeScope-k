const KEY = 'homescope_borrador_propiedad';

export function useBorradorPropiedad() {
  function guardar(data) {
    localStorage.setItem(KEY, JSON.stringify({ ...data, _savedAt: new Date().toISOString() }));
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function limpiar() {
    localStorage.removeItem(KEY);
  }

  return { guardar, cargar, limpiar };
}
