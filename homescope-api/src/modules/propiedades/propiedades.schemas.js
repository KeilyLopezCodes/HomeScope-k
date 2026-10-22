import { z } from 'zod';
import { PERIODOS_ESTADISTICAS } from './propiedades.estadisticas.js';

const MODALIDADES = ['venta', 'alquiler'];
const MONEDAS     = ['GTQ', 'USD'];

// Campos comunes editables
const camposPropiedad = {
  tipo_propiedad_id: z.coerce.number().int().positive(),
  titulo:            z.string().min(3).max(150),
  descripcion:       z.string().min(20).max(5000).optional(),
  modalidad:         z.enum(MODALIDADES),
  // Tope de la columna NUMERIC(14,2): sin él, un precio enorme llegaría a la BD y respondería 500
  precio:            z.coerce.number().positive().max(999_999_999_999.99, 'El precio es demasiado alto'),
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

// ── Catálogo: GET /propiedades con búsqueda por texto y filtros combinables ──

// Mismos valores que tipo_propiedad (migración del módulo de propiedades)
export const TIPOS_PROPIEDAD = ['casa', 'apartamento', 'terreno', 'local', 'oficina'];
export const ORDENES = ['relevancia', 'recientes', 'precio_asc', 'precio_desc', 'indice_desc'];

// Los formularios y Swagger mandan "" cuando un campo queda vacío: se trata como no enviado
const opcional = (schema) => z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional());

// Sin parámetros es el catálogo completo; con ellos, la búsqueda (RF-18, HU-20). Siempre paginado (RNF-02)
export const MAX_COMPARAR = 4;
export const MAX_MAPA = 100;

export const listarPropiedadesSchema = z.object({
  // Texto libre: título, descripción, dirección, zona, municipio y departamento, sin distinguir tildes
  q:                opcional(z.string().trim().min(2, 'Escribe al menos 2 caracteres').max(100)),
  modalidad:        opcional(z.enum(MODALIDADES)),
  // ?tipo=casa  o  ?tipo=casa,apartamento
  tipo:             opcional(z.string()
    .transform((v) => [...new Set(v.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))])
    .refine((lista) => lista.length && lista.every((t) => TIPOS_PROPIEDAD.includes(t)), {
      message: `Tipos válidos: ${TIPOS_PROPIEDAD.join(', ')}`,
    })),
  precio_min:       opcional(z.coerce.number().min(0)),
  precio_max:       opcional(z.coerce.number().min(0)),
  // Moneda de los filtros de precio; solo se comparan propiedades publicadas en esa moneda
  moneda:           opcional(z.enum(MONEDAS)),
  habitaciones_min: opcional(z.coerce.number().int().min(0).max(20)),
  // Puntaje mínimo del Índice de Conveniencia vigente (excluye las propiedades sin índice)
  indice_min:       opcional(z.coerce.number().min(0).max(100)),
  orden:            opcional(z.enum(ORDENES)),
  // ?ids=12,15,40: esas propiedades (máximo 4, comparador), en ese orden y con el índice desglosado
  ids:              opcional(z.string()
    .transform((v) => [...new Set(v.split(',').map((x) => Number(x.trim())).filter((x) => x))])
    .refine((lista) => lista.length >= 1 && lista.every((x) => Number.isInteger(x) && x > 0), { message: 'ids debe ser una lista de ids separados por coma' })
    .refine((lista) => lista.length <= MAX_COMPARAR, { message: `Se comparan hasta ${MAX_COMPARAR} propiedades` })),
  // ?bbox=oeste,sur,este,norte (longitudes y latitudes): solo las que están dentro del área visible
  // del mapa. Las propiedades sin coordenadas no aparecen
  bbox:             opcional(z.string()
    .transform((v) => v.split(',').map((x) => Number(x.trim())))
    .refine((c) => c.length === 4 && c.every(Number.isFinite), { message: 'bbox debe ser oeste,sur,este,norte' })
    .refine(([oeste, sur, este, norte]) => sur >= -90 && norte <= 90 && sur < norte && oeste >= -180 && este <= 180 && oeste < este, {
      message: 'bbox fuera de rango: sur < norte (−90 a 90) y oeste < este (−180 a 180)',
    })
    .transform(([oeste, sur, este, norte]) => ({ oeste, sur, este, norte }))),
  page:             z.coerce.number().int().min(1).default(1),
  // El mapa pide más a la vez (todas las del área visible, hasta MAX_MAPA)
  pageSize:         z.coerce.number().int().min(1).max(MAX_MAPA).default(20),
})
  .refine((f) => f.bbox || f.pageSize <= 50, { message: 'pageSize máximo 50 (hasta 100 con bbox)', path: ['pageSize'] })
  .refine((f) => f.precio_min == null || f.precio_max == null || f.precio_min <= f.precio_max, {
    message: 'precio_min no puede ser mayor que precio_max', path: ['precio_min'],
  })
  .refine((f) => f.orden !== 'relevancia' || f.q, {
    message: 'El orden por relevancia necesita un texto de búsqueda (q)', path: ['orden'],
  })
  .transform((f) => ({
    ...f,
    // Con texto se ordena por relevancia; sin texto, las más recientes primero
    orden: f.orden ?? (f.q ? 'relevancia' : 'recientes'),
    // Los filtros de precio se aplican en quetzales salvo que se pida otra moneda
    moneda: f.moneda ?? (f.precio_min != null || f.precio_max != null ? 'GTQ' : undefined),
  }));

// ── Vigencia de los anuncios ───────────────────────────────────────────────
export const VIGENCIA_DIAS = 60;          // un anuncio publicado vence 60 días después de publicarse o renovarse
export const DIAS_AVISO_EXPIRACION = 7;   // desde 7 días antes se avisa y se puede renovar

// GET /propiedades/mias: pestañas de "Mis propiedades" (cerradas = vendidas o alquiladas)
export const PESTANAS_MIAS = {
  todas:     null,
  borrador:  ['borrador'],
  publicado: ['publicado'],
  pausado:   ['pausado'],
  cerrada:   ['vendido', 'alquilado'],
};
export const listarMiasSchema = z.object({
  estado:   z.enum(Object.keys(PESTANAS_MIAS), {
    errorMap: () => ({ message: `estado debe ser uno de: ${Object.keys(PESTANAS_MIAS).join(', ')}` }),
  }).default('todas'),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

// POST /propiedades/:id/vista
export const ORIGENES_VISTA = ['catalogo', 'mapa', 'busqueda'];
export const registrarVistaSchema = z.object({
  origen: z.enum(ORIGENES_VISTA).default('catalogo'),
});

// GET /propiedades/:id/estadisticas — una propiedad, solo su dueño
export const estadisticasPropiedadSchema = z.object({
  dias: z.coerce.number().int()
    .refine((d) => PERIODOS_ESTADISTICAS.includes(d), 'El período debe ser de 7, 30 o 90 días')
    .default(30),
});

// GET /propiedades/mias/estadisticas — panel del vendedor
export const estadisticasSchema = z.object({
  dias: z.coerce.number().int()
    .refine((d) => PERIODOS_ESTADISTICAS.includes(d), 'El período debe ser de 7, 30 o 90 días')
    .default(30),
  propiedad_id: z.coerce.number().int().positive().optional(),
});

// GET /propiedades/:id/historial-precios
export const historialPreciosSchema = z.object({
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
