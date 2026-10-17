// Carga de la Maps JavaScript API en el cliente (clave de navegador restringida por dominio)
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
// Los marcadores avanzados exigen un Map ID; DEMO_MAP_ID sirve para desarrollo
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// El .env.example trae un valor de ejemplo: sin una clave real no se intenta cargar la API
export const HAY_CLAVE = Boolean(API_KEY) && API_KEY !== 'your_browser_key';

// Centro de Guatemala para cuando aún no hay ubicación
export const CENTRO_GUATEMALA = { lat: 15.5, lng: -90.25 };

let carga = null;

// Devuelve las clases que usa la app; el script se inserta una sola vez
export function cargarGoogleMaps() {
  if (!HAY_CLAVE) return Promise.reject(new Error('Falta configurar VITE_GOOGLE_MAPS_BROWSER_KEY'));

  carga ??= new Promise((resolve, reject) => {
    const callback = '__homescopeMapsListo';
    window[callback] = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({
      key: API_KEY, v: 'weekly', loading: 'async', language: 'es', region: 'GT', callback,
    })}`;
    script.async = true;
    script.onerror = () => { carga = null; reject(new Error('No se pudo cargar Google Maps')); };
    document.head.appendChild(script);
  }).then(async () => {
    const { importLibrary } = window.google.maps;
    const [{ Map }, { AdvancedMarkerElement, Marker }, streetView, { Geocoder }, { spherical }] =
      await Promise.all([
        importLibrary('maps'), importLibrary('marker'), importLibrary('streetView'),
        importLibrary('geocoding'), importLibrary('geometry'),
      ]);
    return {
      Map, AdvancedMarkerElement, Marker, spherical,
      StreetViewPanorama: streetView.StreetViewPanorama,
      StreetViewService:  streetView.StreetViewService,
      StreetViewSource:   streetView.StreetViewSource,
      geocoder: new Geocoder(),
    };
  });

  return carga;
}

// LatLng de Google o literal → { lat, lng }
export function aLiteral(posicion) {
  if (!posicion) return null;
  return typeof posicion.lat === 'function'
    ? { lat: posicion.lat(), lng: posicion.lng() }
    : { lat: posicion.lat, lng: posicion.lng };
}

const componente = (resultado, tipo) =>
  resultado.address_components.find((c) => c.types.includes(tipo))?.long_name;

// Geocodificación inversa: punto del mapa → dirección, zona, municipio y departamento
export async function direccionDesdePosicion(posicion) {
  const { geocoder } = await cargarGoogleMaps();
  try {
    const { results } = await geocoder.geocode({ location: posicion });
    // El primer resultado puede ser solo un plus code (p. ej. "7C2Q+5X"): se prefiere una dirección real
    const r = results.find((x) => !x.types.includes('plus_code')) ?? results[0];
    if (!r) return null;
    return {
      direccion:    r.formatted_address.replace(/,\s*Guatemala$/i, ''),
      zona:         componente(r, 'sublocality_level_1') ?? componente(r, 'neighborhood') ?? null,
      municipio:    componente(r, 'locality') ?? componente(r, 'administrative_area_level_2') ?? null,
      departamento: componente(r, 'administrative_area_level_1')
        ?.replace(/^departamento de\s+/i, '').replace(/\s+department$/i, '') ?? null,
    };
  } catch {
    return null; // ZERO_RESULTS y similares llegan como excepción
  }
}

// Geocodificación directa: texto de la dirección → { lat, lng }
export async function posicionDesdeDireccion(texto) {
  const { geocoder } = await cargarGoogleMaps();
  try {
    const { results } = await geocoder.geocode({ address: texto, region: 'GT' });
    return results[0] ? aLiteral(results[0].geometry.location) : null;
  } catch {
    return null;
  }
}
