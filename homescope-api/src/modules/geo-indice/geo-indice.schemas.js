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

// Radio por defecto de la arquitectura: una consulta de 2 km por categoría
export const RADIO_DEFECTO_M = 2000;

const CODIGOS = Object.keys(CATEGORIAS_INTERES);

export const puntosInteresSchema = z.object({
  lat:   z.coerce.number().min(-90).max(90),
  lng:   z.coerce.number().min(-180).max(180),
  radio: z.coerce.number().int().min(100).max(5000).default(RADIO_DEFECTO_M),
  // ?categorias=salud,educacion  → solo esas; sin el parámetro, todas
  categorias: z.string().optional()
    .transform((v) => (v ? [...new Set(v.split(',').map((c) => c.trim()).filter(Boolean))] : CODIGOS))
    .refine((lista) => lista.every((c) => CODIGOS.includes(c)), {
      message: `Categorías válidas: ${CODIGOS.join(', ')}`,
    }),
});
