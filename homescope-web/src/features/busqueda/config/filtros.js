// Filtros del catálogo: mismos nombres y valores que los parámetros de GET /propiedades

export const MODALIDADES = [
  { valor: 'venta',    etiqueta: 'Venta' },
  { valor: 'alquiler', etiqueta: 'Alquiler' },
];

export const TIPOS = [
  { valor: 'casa',        etiqueta: 'Casa' },
  { valor: 'apartamento', etiqueta: 'Apartamento' },
  { valor: 'terreno',     etiqueta: 'Terreno' },
  { valor: 'local',       etiqueta: 'Local' },
  { valor: 'oficina',     etiqueta: 'Oficina' },
];

export const HABITACIONES = [1, 2, 3, 4, 5];

// Umbrales del semáforo (algoritmo v1.0)
export const INDICES = [
  { valor: 40, etiqueta: 'Amarillo o verde', detalle: '40 o más', nivel: 'amarillo' },
  { valor: 70, etiqueta: 'Solo verde',       detalle: '70 o más', nivel: 'verde' },
];

export const MONEDAS = ['GTQ', 'USD'];

export const ORDENES = [
  { valor: 'relevancia',  etiqueta: 'Más relevantes', requiereTexto: true },
  { valor: 'recientes',   etiqueta: 'Más recientes' },
  { valor: 'precio_asc',  etiqueta: 'Precio: menor a mayor' },
  { valor: 'precio_desc', etiqueta: 'Precio: mayor a menor' },
  { valor: 'indice_desc', etiqueta: 'Mejor índice' },
];

// Orden fijo de los parámetros en la URL, para que la misma búsqueda dé siempre la misma dirección
const CLAVES = ['q', 'modalidad', 'tipo', 'precio_min', 'precio_max', 'moneda', 'habitaciones_min', 'indice_min', 'orden'];

const numero = (v, { min = 0, max = Infinity, entero = false } = {}) => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (entero && !Number.isInteger(n))) return undefined;
  return n;
};

// URL → filtros. Lo inválido se ignora (un enlace editado a mano no debe romper el catálogo)
export function leerFiltros(params) {
  const q = params.get('q')?.trim();
  const tipos = params.get('tipo')?.split(',').filter((t) => TIPOS.some((x) => x.valor === t));
  const f = {
    q:                q && q.length >= 2 ? q.slice(0, 100) : undefined,
    modalidad:        MODALIDADES.some((m) => m.valor === params.get('modalidad')) ? params.get('modalidad') : undefined,
    tipo:             tipos?.length ? [...new Set(tipos)] : undefined,
    precio_min:       numero(params.get('precio_min')),
    precio_max:       numero(params.get('precio_max')),
    moneda:           MONEDAS.includes(params.get('moneda')) ? params.get('moneda') : undefined,
    habitaciones_min: numero(params.get('habitaciones_min'), { min: 1, max: 20, entero: true }),
    indice_min:       numero(params.get('indice_min'), { max: 100 }),
    orden:            ORDENES.some((o) => o.valor === params.get('orden')) ? params.get('orden') : undefined,
  };
  if (f.precio_min != null && f.precio_max != null && f.precio_min > f.precio_max) f.precio_max = undefined;
  if (f.precio_min == null && f.precio_max == null) f.moneda = undefined;
  if (f.orden === 'relevancia' && !f.q) f.orden = undefined;
  return f;
}

// filtros → parámetros (URL y API), sin los vacíos
export function escribirFiltros(filtros) {
  const params = new URLSearchParams();
  for (const clave of CLAVES) {
    const v = filtros[clave];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    params.set(clave, Array.isArray(v) ? v.join(',') : String(v));
  }
  return params;
}

// El orden no cuenta como filtro: no reduce los resultados
export const hayFiltrosActivos = (f) => CLAVES.some((c) => c !== 'orden' && f[c] != null);
