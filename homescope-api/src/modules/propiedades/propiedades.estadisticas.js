// Reglas del panel del vendedor: período de consulta, serie diaria y sugerencias ante bajo desempeño.
// Funciones puras (sin Prisma ni Express) para poder probarlas sin base de datos.

export const ZONA_HORARIA = 'America/Guatemala';
export const PERIODOS_ESTADISTICAS = [7, 30, 90];

const DIA_MS = 24 * 60 * 60 * 1000;

// Umbrales de las sugerencias
export const UMBRALES = {
  diasParaEvaluar:   3,    // una publicación más nueva aún no se juzga
  vistasPorMes:      5,    // mínimo esperado de vistas cada 30 días publicada
  fraccionPromedio:  0.5,  // o menos de la mitad del promedio diario de sus otras publicadas
  vistasSinInteres:  40,   // vistas cada 30 días publicada sin ningún favorito ni mensaje…
  minimoSinInteres:  25,   // …y nunca menos de estas (con pocas vistas, cero interés es normal)
  fotosRecomendadas: 5,
  descripcionMinima: 150,  // caracteres
};

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

// Una fila por día, con 0 en los días sin actividad. Cada métrica: Map 'YYYY-MM-DD' → cantidad
export function armarSerie(fechas, { vistas, favoritos, mensajes }) {
  return fechas.map((fecha) => ({
    fecha,
    vistas:    vistas.get(fecha) ?? 0,
    favoritos: favoritos.get(fecha) ?? 0,
    mensajes:  mensajes.get(fecha) ?? 0,
  }));
}

// Días del período en que la propiedad estuvo publicada (1 a `dias`). Las vistas se comparan por día
// activo: una publicada hace 10 días no compite en un período de 90 con las que llevan meses
export function diasActivos(p, dias, ahora = new Date()) {
  if (!p.fecha_publicacion) return dias;
  const publicada = Math.ceil((ahora.getTime() - new Date(p.fecha_publicacion).getTime()) / DIA_MS);
  return Math.min(Math.max(publicada, 1), dias);
}

// Vistas diarias por debajo de las cuales una publicada tiene bajo desempeño
export const umbralVistasDiarias = (promedioVistasDia = 0) =>
  Math.max(UMBRALES.vistasPorMes / 30, promedioVistasDia * UMBRALES.fraccionPromedio);

// Vistas desde las cuales preocupa que nadie la haya guardado ni escrito
export const umbralSinInteres = (diasPublicada) =>
  Math.max(UMBRALES.minimoSinInteres, Math.ceil((UMBRALES.vistasSinInteres * diasPublicada) / 30));

// Porcentaje de las vistas que terminaron en un favorito o en un primer mensaje
export const tasaInteres = ({ vistas, favoritos, contactos }) =>
  vistas ? Math.round(((favoritos + contactos) / vistas) * 1000) / 10 : null;

// Evalúa una propiedad en el período y devuelve { desempeno, sugerencias }.
//   desempeno: bajo | normal | nueva (publicada hace muy poco) | pausada | cerrada
//   p: { estado, fecha_publicacion, fecha_expiracion, descripcion, latitud, longitud, total_fotos }
//   m: métricas del período { vistas, favoritos, contactos, mensajes_sin_leer }
//   promedioVistasDia: promedio de vistas por día activo de las publicadas del vendedor
export function evaluarDesempeno(p, m, { dias, promedioVistasDia = 0, ahora = new Date() }) {
  const sugerencias = [];
  const agregar = (codigo, nivel, mensaje) => sugerencias.push({ codigo, nivel, mensaje });

  if (m.mensajes_sin_leer > 0)
    agregar('MENSAJES_SIN_LEER', 'alerta',
      `Tienes ${m.mensajes_sin_leer} ${m.mensajes_sin_leer === 1 ? 'mensaje' : 'mensajes'} sin leer. Responder rápido aumenta las probabilidades de cerrar el trato.`);

  if (['vendido', 'alquilado'].includes(p.estado)) return { desempeno: 'cerrada', sugerencias };
  if (p.estado === 'pausado') {
    agregar('PAUSADA', 'info', 'Está pausada y no aparece en el catálogo. Reactívala desde "Mis propiedades" cuando quieras recibir interesados.');
    return { desempeno: 'pausada', sugerencias };
  }

  if (p.fecha_expiracion) {
    const diasRestantes = Math.ceil((new Date(p.fecha_expiracion).getTime() - ahora.getTime()) / DIA_MS);
    if (diasRestantes <= 7)
      agregar('POR_VENCER', 'alerta', diasRestantes <= 0
        ? 'El anuncio venció. Renuévalo desde "Mis propiedades" para seguir recibiendo visitas.'
        : `El anuncio vence en ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}. Renuévalo desde "Mis propiedades".`);
  }

  const diasPublicada = p.fecha_publicacion ? (ahora.getTime() - new Date(p.fecha_publicacion).getTime()) / DIA_MS : 0;
  if (diasPublicada < UMBRALES.diasParaEvaluar) return { desempeno: 'nueva', sugerencias };

  const activos = diasActivos(p, dias, ahora);
  let bajo = false;
  if (m.vistas / activos < umbralVistasDiarias(promedioVistasDia)) {
    bajo = true;
    agregar('POCAS_VISTAS', 'alerta', `Solo ${m.vistas} ${m.vistas === 1 ? 'vista' : 'vistas'} en los últimos ${activos} días, menos que tus otras propiedades.`);
    if ((p.total_fotos ?? 0) < UMBRALES.fotosRecomendadas)
      agregar('POCAS_FOTOS', 'consejo', `Agrega más fotos: tiene ${p.total_fotos ?? 0} y los anuncios con ${UMBRALES.fotosRecomendadas} o más llaman más la atención.`);
    if ((p.descripcion?.trim().length ?? 0) < UMBRALES.descripcionMinima)
      agregar('DESCRIPCION_CORTA', 'consejo', 'Amplía la descripción: menciona los ambientes, el estado de la propiedad y qué hay cerca.');
    if (p.latitud == null || p.longitud == null)
      agregar('SIN_UBICACION', 'consejo', 'Marca la ubicación en el mapa: así aparece en las búsquedas por mapa y obtiene su índice de conveniencia.');
    agregar('REVISAR_TITULO', 'consejo', 'Revisa que el título describa lo más atractivo (tipo, zona y una característica destacada).');
  } else if (m.vistas >= umbralSinInteres(activos) && m.favoritos === 0 && m.contactos === 0) {
    bajo = true;
    agregar('SIN_INTERES', 'alerta', `${m.vistas} personas la vieron pero nadie la guardó ni escribió: revisa que el precio sea competitivo para la zona y que la foto de portada muestre lo mejor.`);
  }

  return { desempeno: bajo ? 'bajo' : 'normal', sugerencias };
}
