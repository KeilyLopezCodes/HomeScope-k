// Las visitas son en hora de Guatemala: se muestran siempre en esa zona, sin importar la del navegador
const ZONA = 'America/Guatemala';

export const fechaVisita = (iso) => new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long',
}).format(new Date(iso));

export const horaVisita = (iso) => new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA, hour: 'numeric', minute: '2-digit',
}).format(new Date(iso));

export const fechaHoraVisita = (iso) => `${fechaVisita(iso)}, ${horaVisita(iso)}`;

// Fecha de un día del calendario → 'YYYY-MM-DD' (el calendario trabaja con fechas locales)
export const claveDia = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

// 'YYYY-MM-DD' → Date local a mediodía (evita que el cambio de zona lo mueva de día)
export const diaDeClave = (clave) => new Date(`${clave}T12:00:00`);
