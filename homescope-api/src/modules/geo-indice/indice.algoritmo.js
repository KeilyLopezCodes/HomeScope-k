// Algoritmo del Índice de Conveniencia — docs/HomeScope_Indice_Conveniencia.md
// Funciones puras: sin BD ni Google, para que el cálculo sea igual en todas partes y se pueda probar.
// Cualquier cambio en estos parámetros (o en los pesos de categoria_interes) exige subir la versión
// y recalcular todas las propiedades publicadas (RNF-13).

export const VERSION_ALGORITMO = 'v1.0';

export const PARAMETROS = {
  distanciaCompletaM: 100,   // D0: un lugar a esta distancia o menos vale completo
  distanciaMaximaM:   1500,  // R: a esta distancia o más ya no suma
  pesoProximidad:     0.5,   // α; la oferta pesa 1 − α
  radioConsultaM:     2000,  // radio de la consulta a Google Places
  umbralVerde:        70,
  umbralAmarillo:     40,
  // N_c: oferta que se considera completa en cada categoría
  cantidadReferencia: {
    educacion: 10, salud: 10, comercio: 15, transporte: 6, seguridad: 3, areas_verdes: 6,
  },
};

export const redondear2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

// f(d): valor de un lugar según su distancia, de 1 (muy cerca) a 0 (a R o más)
export function valorPorDistancia(d, { distanciaCompletaM: D0, distanciaMaximaM: R } = PARAMETROS) {
  if (d <= D0) return 1;
  if (d >= R) return 0;
  return (R - d) / (R - D0);
}

// distancias: metros de cada lugar de la categoría a la propiedad
export function calcularSubpuntaje(distancias, cantidadReferencia, parametros = PARAMETROS) {
  const { pesoProximidad: alfa, distanciaMaximaM: R } = parametros;
  const valores = distancias.map((d) => valorPorDistancia(d, parametros));
  const distanciaMinima = distancias.length ? Math.min(...distancias) : null;

  const proximidad = distanciaMinima === null ? 0 : valorPorDistancia(distanciaMinima, parametros);
  const oferta = Math.min(1, valores.reduce((s, v) => s + v, 0) / cantidadReferencia);

  return {
    puntaje:            redondear2(100 * (alfa * proximidad + (1 - alfa) * oferta)),
    cantidad_puntos:    distancias.filter((d) => d < R).length, // los que suman al índice
    distancia_minima_m: distanciaMinima === null ? null : Math.round(distanciaMinima),
  };
}

export function nivelSemaforo(puntaje, { umbralVerde, umbralAmarillo } = PARAMETROS) {
  if (puntaje >= umbralVerde) return 'verde';
  if (puntaje >= umbralAmarillo) return 'amarillo';
  return 'rojo';
}

// Los pesos de las categorías activas deben sumar exactamente 1.00 (se compara en centésimas
// para no depender de errores de punto flotante) y cada categoría debe tener cantidad de referencia
export function validarPesos(pesos, parametros = PARAMETROS) {
  const codigos = Object.keys(pesos);
  if (!codigos.length) throw new Error('No hay categorías de interés activas');

  const centesimas = codigos.reduce((s, c) => s + Math.round(Number(pesos[c]) * 100), 0);
  if (centesimas !== 100)
    throw new Error(`Los pesos de las categorías activas deben sumar 1.00 (suman ${(centesimas / 100).toFixed(2)})`);

  const sinReferencia = codigos.filter((c) => !parametros.cantidadReferencia[c]);
  if (sinReferencia.length)
    throw new Error(`Categorías sin cantidad de referencia en ${VERSION_ALGORITMO}: ${sinReferencia.join(', ')}`);
}

// distanciasPorCategoria: { educacion: [108, 153, …], salud: […], … }
// pesos:                  { educacion: 0.20, … } (de categoria_interes)
// → { puntaje_total, nivel_semaforo, subpuntajes: { educacion: { puntaje, cantidad_puntos, distancia_minima_m }, … } }
export function calcularIndice(distanciasPorCategoria, pesos, parametros = PARAMETROS) {
  validarPesos(pesos, parametros);

  const subpuntajes = {};
  let total = 0;
  for (const [codigo, peso] of Object.entries(pesos)) {
    const sub = calcularSubpuntaje(
      distanciasPorCategoria[codigo] ?? [], parametros.cantidadReferencia[codigo], parametros);
    subpuntajes[codigo] = sub;
    // El total se calcula con los subpuntajes ya redondeados: se reconstruye exacto desde el desglose (RNF-10)
    total += Number(peso) * sub.puntaje;
  }

  const puntaje_total = redondear2(total);
  return { puntaje_total, nivel_semaforo: nivelSemaforo(puntaje_total, parametros), subpuntajes };
}
