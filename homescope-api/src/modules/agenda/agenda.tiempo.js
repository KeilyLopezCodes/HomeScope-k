// Cálculo de horarios de visita. Funciones puras (sin BD) para poder probarlas.
// Las franjas de disponibilidad se declaran en hora de Guatemala; las visitas se guardan como instantes (UTC).

export const ZONA_HORARIA = 'America/Guatemala';
// Guatemala no usa horario de verano desde 2006: el desfase es fijo
const DESFASE = '-06:00';
const DESFASE_MS = -6 * 60 * 60 * 1000;

export const DURACION_VISITA_MIN = 60;      // cada visita ocupa un bloque de 60 minutos
export const ANTICIPACION_MINIMA_MIN = 120;  // no se puede pedir una visita para dentro de menos de 2 horas
export const DIAS_MAXIMOS = 30;              // ni para dentro de más de 30 días

export const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const MIN = 60 * 1000;
const DIA = 24 * 60 * MIN;

// 'HH:MM' → minutos desde la medianoche
export const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const deMinutos = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Prisma representa TIME como un Date del 1970-01-01 en UTC
export const horaDeBD = (fecha) => deMinutos(fecha.getUTCHours() * 60 + fecha.getUTCMinutes());
export const horaParaBD = (hhmm) => new Date(`1970-01-01T${hhmm}:00Z`);

// Instante → fecha 'YYYY-MM-DD' y minutos del día en hora de Guatemala
export function enHoraLocal(instante) {
  const local = new Date(instante.getTime() + DESFASE_MS);
  return { fecha: local.toISOString().slice(0, 10), minutos: local.getUTCHours() * 60 + local.getUTCMinutes() };
}

// Fecha 'YYYY-MM-DD' + 'HH:MM' en hora de Guatemala → instante
export const instanteLocal = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00${DESFASE}`);

// 1 = lunes … 7 = domingo de una fecha 'YYYY-MM-DD'
export function diaSemana(fecha) {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return d === 0 ? 7 : d;
}

const sumarDias = (fecha, n) => new Date(new Date(`${fecha}T12:00:00Z`).getTime() + n * DIA).toISOString().slice(0, 10);

// Inicios de bloque de una franja: 09:00–12:00 → 09:00, 10:00, 11:00
function iniciosDeFranja({ hora_inicio, hora_fin }) {
  const inicios = [];
  for (let m = aMinutos(hora_inicio); m + DURACION_VISITA_MIN <= aMinutos(hora_fin); m += DURACION_VISITA_MIN) inicios.push(m);
  return inicios;
}

// ¿El instante es el inicio de un bloque de alguna franja de ese día de la semana?
export function coincideConFranja(franjas, instante) {
  const { fecha, minutos } = enHoraLocal(instante);
  const dia = diaSemana(fecha);
  return franjas.some((f) => f.dia_semana === dia && iniciosDeFranja(f).includes(minutos));
}

// ¿Está dentro del rango permitido (al menos 2 horas después de ahora, como máximo 30 días)?
export function dentroDeAnticipacion(instante, ahora = new Date()) {
  const diferencia = instante.getTime() - ahora.getTime();
  return diferencia >= ANTICIPACION_MINIMA_MIN * MIN && diferencia <= DIAS_MAXIMOS * DIA;
}

// Horarios libres día por día.
// franjas:  [{ dia_semana, hora_inicio: 'HH:MM', hora_fin: 'HH:MM' }]
// ocupados: instantes (ms) ya tomados por otras visitas activas del vendedor
// → [{ fecha, dia_semana, dia, horarios: [{ inicio: Date, hora: 'HH:MM' }] }] (solo días con horarios)
export function generarHorarios(franjas, { ahora = new Date(), dias = 14, ocupados = new Set() } = {}) {
  const hoy = enHoraLocal(ahora).fecha;
  const resultado = [];
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(hoy, i);
    const dia = diaSemana(fecha);
    const minutos = [...new Set(franjas.filter((f) => f.dia_semana === dia).flatMap(iniciosDeFranja))].sort((a, b) => a - b);
    const horarios = minutos
      .map((m) => ({ inicio: instanteLocal(fecha, deMinutos(m)), hora: deMinutos(m) }))
      .filter(({ inicio }) => dentroDeAnticipacion(inicio, ahora) && !ocupados.has(inicio.getTime()));
    if (horarios.length) resultado.push({ fecha, dia_semana: dia, dia: NOMBRES_DIA[dia - 1], horarios });
  }
  return resultado;
}

// "martes 21 de octubre, 9:00 a. m." en hora de Guatemala (para notificaciones y correos)
export const fechaHoraLegible = (instante) => new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA_HORARIA, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
}).format(instante);
