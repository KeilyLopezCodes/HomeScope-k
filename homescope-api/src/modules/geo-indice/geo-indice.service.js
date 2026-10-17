// TODO: Calcular índice de conveniencia con pesos por categoría (ADR-08)
// Reglas: pesos en BD con versión del algoritmo; recálculo masivo al cambiar pesos (RNF-13)
import { maps } from '../../shared/adapters/googleMaps.adapter.js';
import { CATEGORIAS_INTERES } from './geo-indice.schemas.js';

// Tiempo estimado sin llamar a Distance Matrix (que se cobra aparte): la distancia en línea recta
// se multiplica por un factor de rodeo por calles y se divide entre una velocidad promedio.
const FACTOR_RODEO     = 1.3;
const VELOCIDAD_A_PIE  = 80;   // m/min (≈ 4.8 km/h)
const VELOCIDAD_AUTO   = 400;  // m/min (≈ 24 km/h en ciudad)

// Mientras no se guarden en BD (punto_interes), se cachea en memoria para no repetir consultas pagadas
const CACHE_TTL_MS  = 24 * 60 * 60 * 1000;
const CACHE_MAXIMO  = 500;
const cache = new Map();

// Distancia en metros entre dos coordenadas (fórmula de haversine)
export function distanciaMetros(a, b) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function tiempoEstimado(distancia) {
  const recorrido = distancia * FACTOR_RODEO;
  return {
    caminando_min: Math.max(1, Math.round(recorrido / VELOCIDAD_A_PIE)),
    en_auto_min:   Math.max(1, Math.round(recorrido / VELOCIDAD_AUTO)),
  };
}

export class GeoIndiceService {
  // Puntos de interés alrededor de una coordenada, agrupados por categoría y ordenados por distancia
  async buscarPuntosInteres({ lat, lng, radio, categorias }) {
    // ~11 m de precisión en la clave: puntos casi iguales comparten resultado
    const clave = `${lat.toFixed(4)},${lng.toFixed(4)},${radio},${[...categorias].sort().join('|')}`;
    const guardado = cache.get(clave);
    if (guardado && guardado.expira > Date.now()) return guardado.valor;

    const origen = { lat, lng };
    const resultados = await Promise.allSettled(categorias.map((codigo) =>
      maps.buscarLugaresCercanos(origen, { tipos: CATEGORIAS_INTERES[codigo].tipos, radio })
    ));

    // Si fallan todas, el problema es el servicio de mapas (clave, cuota, red): no hay nada que mostrar
    if (resultados.every((r) => r.status === 'rejected')) throw resultados[0].reason;

    const grupos = categorias.map((codigo, i) => {
      const { nombre } = CATEGORIAS_INTERES[codigo];
      const r = resultados[i];
      if (r.status === 'rejected') return { categoria: codigo, nombre, total: 0, puntos: [], error: true };

      const puntos = r.value
        .map((lugar) => {
          const distancia = distanciaMetros(origen, { lat: lugar.latitud, lng: lugar.longitud });
          return {
            place_id:    lugar.place_id,
            nombre:      lugar.nombre,
            direccion:   lugar.direccion,
            latitud:     lugar.latitud,
            longitud:    lugar.longitud,
            tipo:        lugar.tipos.find((t) => CATEGORIAS_INTERES[codigo].tipos.includes(t)) ?? lugar.tipos[0] ?? null,
            distancia_m: Math.round(distancia),
            tiempo_estimado: tiempoEstimado(distancia),
          };
        })
        // Places filtra por círculo, pero se descarta cualquier resultado que caiga fuera del radio pedido
        .filter((p) => p.distancia_m <= radio)
        .sort((a, b) => a.distancia_m - b.distancia_m);

      return { categoria: codigo, nombre, total: puntos.length, puntos };
    });

    const valor = {
      origen,
      radio_m: radio,
      categorias: grupos,
      calculo: {
        distancia: 'línea recta (haversine)',
        tiempo:    `estimado: distancia × ${FACTOR_RODEO}, a ${VELOCIDAD_A_PIE} m/min caminando y ${VELOCIDAD_AUTO} m/min en auto`,
      },
    };

    // Solo se cachean respuestas completas, para reintentar las categorías que fallaron
    if (!grupos.some((g) => g.error)) {
      if (cache.size >= CACHE_MAXIMO) cache.delete(cache.keys().next().value);
      cache.set(clave, { valor, expira: Date.now() + CACHE_TTL_MS });
    }
    return valor;
  }
}
