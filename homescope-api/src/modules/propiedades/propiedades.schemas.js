import { z } from 'zod';

const MODALIDADES = ['venta', 'alquiler'];
const MONEDAS     = ['GTQ', 'USD'];

// Campos comunes editables
const camposPropiedad = {
  tipo_propiedad_id: z.coerce.number().int().positive(),
  titulo:            z.string().min(3).max(150),
  descripcion:       z.string().min(20).max(5000).optional(),
  modalidad:         z.enum(MODALIDADES),
  precio:            z.coerce.number().positive(),
  moneda:            z.enum(MONEDAS),
  habitaciones:      z.coerce.number().int().min(0).optional().nullable(),
  banos:             z.coerce.number().min(0).optional().nullable(),
  area_m2:           z.coerce.number().min(0).optional().nullable(),
  parqueos:          z.coerce.number().int().min(0).optional().nullable(),
  direccion:         z.string().min(3).max(300),
  zona:              z.string().max(50).optional().nullable(),
  municipio:         z.string().max(80).optional().nullable(),
  departamento:      z.string().max(80).optional().nullable(),
  latitud:           z.coerce.number().min(-90).max(90).optional().nullable(),
  longitud:          z.coerce.number().min(-180).max(180).optional().nullable(),
  google_place_id:   z.string().max(200).optional().nullable(),
  paso_formulario:   z.coerce.number().int().min(1).max(4).optional(),
};

export const crearPropiedadSchema = z.object({
  ...camposPropiedad,
  // Al crear, estado siempre es borrador (el backend lo fuerza)
});

// Al editar todos los campos son opcionales
export const editarPropiedadSchema = z.object(
  Object.fromEntries(
    Object.entries(camposPropiedad).map(([k, v]) => [k, v.optional()])
  )
).refine((d) => Object.keys(d).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});

// Query del catálogo público: ?page=1&pageSize=20 (RNF-02)
export const listarPropiedadesSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// ── Fotos ──────────────────────────────────────────────────────────────────

export const FOTOS_CONFIG = {
  maxPorPropiedad: 10,
  maxBytes:        5 * 1024 * 1024, // 5 MB por imagen
  tipos:           ['image/jpeg', 'image/png', 'image/webp'],
};

// Campos de texto que acompañan al multipart de POST /:id/fotos
export const subirFotosSchema = z.object({
  // Índice (dentro de los archivos enviados) de la foto que será portada
  portada: z.coerce.number().int().min(0).optional(),
});

// Orden completo de las fotos: todos los ids de la propiedad, en el orden deseado
export const ordenFotosSchema = z.object({
  orden: z.array(z.coerce.number().int().positive()).min(1),
});

// Estados válidos para la transición manual del vendedor
export const ESTADOS_VALIDOS = ['borrador', 'publicado', 'pausado', 'vendido', 'alquilado'];

// Transiciones permitidas: estado_actual → estados_destino[]
export const TRANSICIONES = {
  borrador:   ['publicado'],
  publicado:  ['pausado', 'vendido', 'alquilado'],
  pausado:    ['publicado', 'vendido', 'alquilado'],
  vendido:    [],
  alquilado:  [],
};
