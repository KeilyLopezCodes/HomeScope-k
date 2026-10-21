// Períodos de estadísticas por día en hora de Guatemala (panel del vendedor y del administrador)

export const ZONA_HORARIA = 'America/Guatemala';
export const PERIODOS_ESTADISTICAS = [7, 30, 90];

const DIA_MS = 24 * 60 * 60 * 1000;

const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
});

// Fecha → 'YYYY-MM-DD' en la hora de Guatemala
export const diaLocal = (fecha) => formatoDia.format(fecha);

// Los últimos `dias` días, hoy incluido: la lista de fechas y el instante en que empieza el primero.
// Guatemala no tiene horario de verano: es UTC−6 todo el año
export function rangoPeriodo(dias, ahora = new Date()) {
  const fechas = [];
  for (let i = dias - 1; i >= 0; i--) fechas.push(diaLocal(new Date(ahora.getTime() - i * DIA_MS)));
  return { fechas, desde: new Date(`${fechas[0]}T00:00:00-06:00`) };
}

// Una fila por día con 0 en los días sin datos. series: { clave: [{ fecha: 'YYYY-MM-DD', total }] }
export function serieDiaria(fechas, series) {
  const mapas = Object.entries(series).map(([clave, filas]) => [clave, new Map(filas.map((f) => [f.fecha, f.total]))]);
  return fechas.map((fecha) => ({
    fecha,
    ...Object.fromEntries(mapas.map(([clave, mapa]) => [clave, mapa.get(fecha) ?? 0])),
  }));
}
