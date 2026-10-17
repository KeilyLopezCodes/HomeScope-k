import { maps } from '../../shared/adapters/googleMaps.adapter.js';
import { CATEGORIAS_INTERES, RADIO_CONSULTA_M } from './geo-indice.schemas.js';
import { GeoIndiceRepository } from './geo-indice.repository.js';
import { PARAMETROS, VERSION_ALGORITMO, calcularIndice, validarPesos } from './indice.algoritmo.js';
import { PropiedadesService } from '../propiedades/propiedades.service.js';

const propiedadesService = new PropiedadesService();
const repo = new GeoIndiceRepository();

// Tiempo estimado sin llamar a Distance Matrix (que se cobra aparte): la distancia en línea recta
// se multiplica por un factor de rodeo por calles y se divide entre una velocidad promedio.
const FACTOR_RODEO     = 1.3;
const VELOCIDAD_A_PIE  = 80;   // m/min (≈ 4.8 km/h)
const VELOCIDAD_AUTO   = 400;  // m/min (≈ 24 km/h en ciudad)

// Mientras no se guarden en BD (punto_interes), los lugares se cachean en memoria para no repetir
// consultas pagadas. Una entrada por coordenada y categoría, siempre con el radio de consulta (2 km):
// los radios menores y cualquier combinación de categorías salen de las mismas entradas.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAXIMO = 3000; // ≈ 500 coordenadas × 6 categorías
const cache = new Map();   // clave → { promesa, expira }

// ~11 m de precisión: puntos casi iguales comparten entrada. Los tipos van en la clave porque el índice
// usa los de categoria_interes (BD) y el listado los de geo-indice.schemas.js
const claveCache = ({ lat, lng }, categoria, tipos) =>
  `${lat.toFixed(4)},${lng.toFixed(4)}|${categoria}|${[...tipos].sort().join(',')}`;

// Lugares de una categoría en 2 km. Devuelve { lugares, desdeCache }.
// Se guarda la promesa (no el resultado) para que dos consultas simultáneas iguales hagan una sola llamada.
async function lugaresDeCategoria(origen, categoria, tipos = CATEGORIAS_INTERES[categoria].tipos) {
  const clave = claveCache(origen, categoria, tipos);
  const entrada = cache.get(clave);
  if (entrada && entrada.expira > Date.now()) {
    return { lugares: await entrada.promesa, desdeCache: true };
  }

  const promesa = maps.buscarLugaresCercanos(origen, { tipos, radio: RADIO_CONSULTA_M });
  if (cache.size >= CACHE_MAXIMO) cache.delete(cache.keys().next().value); // la más antigua
  cache.set(clave, { promesa, expira: Date.now() + CACHE_TTL_MS });
  // Un fallo no se cachea: la siguiente consulta vuelve a intentar
  promesa.catch(() => { if (cache.get(clave)?.promesa === promesa) cache.delete(clave); });

  return { lugares: await promesa, desdeCache: false };
}

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

const redondear6 = (x) => Math.round(x * 1e6) / 1e6;

export class GeoIndiceService {
  // Calcula el Índice de Conveniencia de una propiedad y lo guarda (trabajo `calcular-indice`, ADR-08).
  // Si Google falla en cualquier categoría lanza el error para que pg-boss reintente: nunca se guarda un
  // índice parcial. Devuelve el índice guardado o { omitido: motivo } cuando no corresponde calcular.
  async calcularYGuardar(propiedadId) {
    const propiedad = await propiedadesService.datosParaIndice(propiedadId);
    if (!propiedad) return { omitido: 'NO_EXISTE' };
    if (propiedad.estado !== 'publicado') return { omitido: 'NO_PUBLICADA' };
    if (propiedad.lat == null || propiedad.lng == null) {
      // Se quitaron las coordenadas: el índice anterior ya no describe la ubicación
      await repo.desactivarIndice(propiedadId);
      return { omitido: 'SIN_UBICACION' };
    }

    const categorias = await repo.categoriasActivas();
    const pesos = Object.fromEntries(categorias.map((c) => [c.nombre, Number(c.peso)]));
    validarPesos(pesos); // antes de gastar llamadas a Google

    const origen = { lat: propiedad.lat, lng: propiedad.lng };
    const resultados = await Promise.all(categorias.map((c) =>
      lugaresDeCategoria(origen, c.nombre, c.google_place_types.split(',').map((t) => t.trim()).filter(Boolean))
    ));

    const puntos = [];
    const distancias = {};
    categorias.forEach((categoria, i) => {
      const vistos = new Set(); // un lugar cuenta una sola vez dentro de su categoría
      distancias[categoria.nombre] = [];
      for (const lugar of resultados[i].lugares) {
        if (vistos.has(lugar.place_id)) continue;
        vistos.add(lugar.place_id);
        // Metros enteros, los mismos que se guardan: el índice se puede recalcular desde punto_interes
        const distancia = Math.round(distanciaMetros(origen, { lat: lugar.latitud, lng: lugar.longitud }));
        if (distancia > PARAMETROS.radioConsultaM) continue;
        distancias[categoria.nombre].push(distancia);
        puntos.push({
          categoria_id:        categoria.id,
          google_place_id:     lugar.place_id,
          nombre:              lugar.nombre.slice(0, 200),
          latitud:             redondear6(lugar.latitud),
          longitud:            redondear6(lugar.longitud),
          distancia_m:         distancia,
          tiempo_estimado_min: tiempoEstimado(distancia).caminando_min,
          radio_consulta_m:    PARAMETROS.radioConsultaM,
        });
      }
    });

    const resultado = calcularIndice(distancias, pesos);
    return repo.guardarCalculo(propiedadId, {
      puntos,
      indice: {
        puntaje_total:     resultado.puntaje_total,
        nivel_semaforo:    resultado.nivel_semaforo,
        radio_m:           PARAMETROS.distanciaMaximaM,
        version_algoritmo: VERSION_ALGORITMO,
      },
      subpuntajes: categorias.map((c) => ({ categoria_id: c.id, ...resultado.subpuntajes[c.nombre] })),
    });
  }

  // Puntos de interés de una propiedad (con la misma regla de visibilidad que su ficha)
  async puntosInteresDePropiedad(propiedadId, filtros, solicitante = null) {
    const { lat, lng } = await propiedadesService.obtenerUbicacion(propiedadId, solicitante);
    return this.buscarPuntosInteres({ lat, lng, ...filtros });
  }

  // Puntos de interés alrededor de una coordenada, agrupados por categoría y ordenados por distancia
  async buscarPuntosInteres({ lat, lng, radio, categorias }) {
    const origen = { lat, lng };
    const resultados = await Promise.allSettled(categorias.map((c) => lugaresDeCategoria(origen, c)));

    // Si fallan todas, el problema es el servicio de mapas (clave, cuota, red): no hay nada que mostrar
    if (resultados.every((r) => r.status === 'rejected')) throw resultados[0].reason;

    const grupos = categorias.map((codigo, i) => {
      const { nombre, tipos } = CATEGORIAS_INTERES[codigo];
      const r = resultados[i];
      if (r.status === 'rejected') return { categoria: codigo, nombre, total: 0, puntos: [], error: true };

      const puntos = r.value.lugares
        .map((lugar) => {
          const distancia = distanciaMetros(origen, { lat: lugar.latitud, lng: lugar.longitud });
          return {
            place_id:    lugar.place_id,
            nombre:      lugar.nombre,
            direccion:   lugar.direccion,
            latitud:     lugar.latitud,
            longitud:    lugar.longitud,
            tipo:        lugar.tipos.find((t) => tipos.includes(t)) ?? lugar.tipos[0] ?? null,
            distancia_m: Math.round(distancia),
            tiempo_estimado: tiempoEstimado(distancia),
          };
        })
        // Google se consultó a 2 km: aquí se aplica el radio pedido
        .filter((p) => p.distancia_m <= radio)
        .sort((a, b) => a.distancia_m - b.distancia_m);

      return { categoria: codigo, nombre, total: puntos.length, puntos };
    });

    return {
      origen,
      radio_m: radio,
      // true si ninguna categoría necesitó llamar a Google
      desde_cache: resultados.every((r) => r.status === 'fulfilled' && r.value.desdeCache),
      categorias: grupos,
      calculo: {
        distancia: 'línea recta (haversine)',
        tiempo:    `estimado: distancia × ${FACTOR_RODEO}, a ${VELOCIDAD_A_PIE} m/min caminando y ${VELOCIDAD_AUTO} m/min en auto`,
      },
    };
  }
}
