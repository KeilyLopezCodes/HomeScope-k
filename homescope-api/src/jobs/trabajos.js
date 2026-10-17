// Nombres y opciones de los trabajos. Archivo sin dependencias de los módulos para que los
// services puedan encolar sin importar los workers (evita importaciones circulares).

export const CALCULAR_INDICE = 'calcular-indice';

export const OPCIONES_CALCULAR_INDICE = (propiedadId) => ({
  // A lo sumo un cálculo pendiente por propiedad: si cambia la ubicación varias veces seguidas,
  // se encola uno solo detrás del que esté en curso
  singletonKey:      `indice-${propiedadId}`,
  useSingletonQueue: true,
  // Si Google falla: 5 reintentos con espera creciente desde 30 s
  retryLimit:        5,
  retryDelay:        30,
  retryBackoff:      true,
  expireInMinutes:   5,
});
