import { z } from 'zod';

// Categorías del Índice de Conveniencia y los tipos de lugar de Places API (New) que agrupa cada una
// (tabla A de https://developers.google.com/maps/documentation/places/web-service/place-types)
export const CATEGORIAS_INTERES = {
  educacion:    { nombre: 'Educación',    tipos: ['school', 'primary_school', 'secondary_school', 'university', 'preschool'] },
  salud:        { nombre: 'Salud',        tipos: ['hospital', 'doctor', 'pharmacy', 'dental_clinic', 'medical_lab'] },
  comercio:     { nombre: 'Comercio',     tipos: ['supermarket', 'grocery_store', 'convenience_store', 'shopping_mall', 'market'] },
  transporte:   { nombre: 'Transporte',   tipos: ['bus_station', 'bus_stop', 'transit_station', 'taxi_stand'] },
  seguridad:    { nombre: 'Seguridad',    tipos: ['police', 'fire_station'] },
  areas_verdes: { nombre: 'Áreas verdes', tipos: ['park', 'national_park', 'playground', 'hiking_area'] },
};

// Radios permitidos en metros. A Google siempre se le consulta el mayor (2 km por categoría, según la
// arquitectura) y los menores se filtran por distancia, así un mismo resultado sirve para los tres.
export const RADIOS_PERMITIDOS = [500, 1000, 2000];
export const RADIO_CONSULTA_M  = Math.max(...RADIOS_PERMITIDOS);

const CODIGOS = Object.keys(CATEGORIAS_INTERES);

// Filtros comunes: radio y categorías
const filtrosSchema = z.object({
  radio: z.coerce.number({ invalid_type_error: `El radio debe ser uno de: ${RADIOS_PERMITIDOS.join(', ')} (metros)` })
    .refine((r) => RADIOS_PERMITIDOS.includes(r), {
      message: `El radio debe ser uno de: ${RADIOS_PERMITIDOS.join(', ')} (metros)`,
    })
    .default(RADIO_CONSULTA_M),
  // ?categorias=salud,educacion  → solo esas; sin el parámetro, todas
  categorias: z.string().optional()
    .transform((v) => (v ? [...new Set(v.split(',').map((c) => c.trim()).filter(Boolean))] : CODIGOS))
    .refine((lista) => lista.every((c) => CODIGOS.includes(c)), {
      message: `Categorías válidas: ${CODIGOS.join(', ')}`,
    }),
});

// GET /geo/puntos-interes?lat&lng: coordenada libre
export const puntosInteresSchema = filtrosSchema.extend({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

// GET /geo/propiedades/:id/puntos-interes: la coordenada es la de la propiedad
export const puntosInteresPropiedadSchema = filtrosSchema;
