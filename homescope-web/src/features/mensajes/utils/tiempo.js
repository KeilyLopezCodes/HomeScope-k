const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const UNIDADES = [
  ['year', 365 * 24 * 3600], ['month', 30 * 24 * 3600], ['week', 7 * 24 * 3600],
  ['day', 24 * 3600], ['hour', 3600], ['minute', 60],
];

// "hace 5 minutos", "ayer"…; menos de un minuto: "ahora"
export function haceCuanto(fecha) {
  const segundos = (new Date(fecha).getTime() - Date.now()) / 1000;
  if (Math.abs(segundos) < 60) return 'ahora';
  const [unidad, tamano] = UNIDADES.find(([, s]) => Math.abs(segundos) >= s);
  return relativo.format(Math.round(segundos / tamano), unidad);
}

// Hora del mensaje; si no es de hoy, también la fecha
export function horaMensaje(fecha) {
  const d = new Date(fecha);
  const hoy = new Date().toDateString() === d.toDateString();
  return new Intl.DateTimeFormat('es-GT', hoy
    ? { hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
}
