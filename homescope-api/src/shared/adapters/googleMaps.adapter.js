import { env } from '../../config/env.js';
import { MapsPort } from '../ports/index.js';
import { AppError } from '../errors/AppError.js';

// Places API (New): la versión legacy (nearbysearch/json) ya no se habilita en proyectos nuevos
const URL_NEARBY = 'https://places.googleapis.com/v1/places:searchNearby';
// Solo se piden los campos que se usan: Google cobra según la máscara de campos
const CAMPOS = 'places.id,places.displayName,places.formattedAddress,places.location,places.types';
const TIMEOUT_MS = 8000;

export class GoogleMapsAdapter extends MapsPort {
  async buscarLugaresCercanos({ lat, lng }, { tipos, radio, maximo = 20 }) {
    let res;
    try {
      res = await fetch(URL_NEARBY, {
        method: 'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   env.GOOGLE_MAPS_SERVER_KEY,
          'X-Goog-FieldMask': CAMPOS,
        },
        body: JSON.stringify({
          includedTypes:  tipos,
          maxResultCount: Math.min(maximo, 20), // tope de la API
          rankPreference: 'DISTANCE',
          languageCode:   'es',
          regionCode:     'GT',
          locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radio } },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      console.error('Google Places no respondió:', err.message);
      throw new AppError('MAPS_NO_DISPONIBLE', 'El servicio de mapas no respondió. Intenta de nuevo.', 502);
    }

    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) {
      // El detalle de Google (clave, cuota, tipos inválidos) va al log, no al cliente
      console.error(`Google Places respondió ${res.status}:`, cuerpo.error?.message);
      throw new AppError('MAPS_NO_DISPONIBLE', 'No se pudo consultar el servicio de mapas.', 502);
    }

    return (cuerpo.places ?? []).map((p) => ({
      place_id:  p.id,
      nombre:    p.displayName?.text ?? 'Sin nombre',
      direccion: p.formattedAddress ?? null,
      latitud:   p.location.latitude,
      longitud:  p.location.longitude,
      tipos:     p.types ?? [],
    }));
  }
}

export const maps = new GoogleMapsAdapter();
