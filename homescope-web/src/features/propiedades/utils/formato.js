export function formatearPrecio(precio, moneda) {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency', currency: moneda, maximumFractionDigits: 0,
  }).format(Number(precio));
}

export function formatearFecha(fecha) {
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(fecha));
}

// Zona, municipio y departamento si existen; si no, la dirección
export function ubicacionResumida({ zona, municipio, departamento, direccion }) {
  const partes = [zona, municipio, departamento].map((p) => p?.trim()).filter(Boolean);
  return partes.length ? partes.join(', ') : direccion;
}

export const MODALIDAD = {
  venta:    { etiqueta: 'Venta',    variant: 'primary' },
  alquiler: { etiqueta: 'Alquiler', variant: 'success' },
};
