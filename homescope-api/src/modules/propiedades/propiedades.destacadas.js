// Propiedades destacadas del carrusel (GET /propiedades/destacadas): las más recientes y las más populares
// por favoritos, sin duplicados. Reglas puras + un servicio con caché en memoria de 5 minutos.
// Sin Prisma ni adaptadores importados: el repositorio y el almacenamiento se inyectan (pruebas sin BD)

export const DESTACADAS = {
  recientes:   3,
  populares:   3,
  anchoFoto:   1600,          // px, ancho máximo de la foto en el carrusel
  cacheMs:     5 * 60 * 1000, // la respuesta se reutiliza durante 5 minutos
};

// Zona, municipio y departamento si existen; si no, la dirección (igual que las tarjetas del catálogo)
export function ubicacionResumida({ zona, municipio, departamento, direccion }) {
  const partes = [zona, municipio, departamento].map((p) => p?.trim()).filter(Boolean);
  return partes.length ? partes.join(', ') : (direccion ?? null);
}

// Del ranking por favoritos ([{ id, favoritos }], ya ordenado) toma las primeras `cantidad` que no están
// entre las recientes. Las que no tienen favoritos no cuentan como populares
export function seleccionarPopulares(ranking, idsRecientes, cantidad = DESTACADAS.populares) {
  const excluidas = new Set(idsRecientes);
  return ranking.filter((r) => r.favoritos > 0 && !excluidas.has(r.id)).slice(0, cantidad);
}

// Propiedad → elemento del carrusel
export function formatearDestacada(p, motivo, { urlFoto, favoritos = null } = {}) {
  return {
    motivo,
    id:        p.id,
    titulo:    p.titulo,
    precio:    p.precio,
    moneda:    p.moneda,
    modalidad: p.modalidad,
    ubicacion: ubicacionResumida(p),
    foto_url:  urlFoto,
    ...(motivo === 'popular' && { favoritos }),
  };
}

export class DestacadasService {
  // repo: recientesConPortada, rankingFavoritos, tarjetasDestacadas · storage: urlOptimizada · ahora: reloj
  constructor({ repo, storage, ahora = Date.now }) {
    this.repo = repo;
    this.storage = storage;
    this.ahora = ahora;
    this.cache = null; // { datos, expira }
  }

  async obtener() {
    if (this.cache && this.cache.expira > this.ahora()) return this.cache.datos;

    // 1) Las publicadas más recientes con portada  2) el ranking por favoritos en una sola consulta agregada.
    // Del ranking se piden recientes + populares: aunque todas las recientes estén en él, quedan suficientes
    const [recientes, ranking] = await Promise.all([
      this.repo.recientesConPortada(DESTACADAS.recientes),
      this.repo.rankingFavoritos(DESTACADAS.recientes + DESTACADAS.populares),
    ]);
    const elegidas = seleccionarPopulares(ranking, recientes.map((p) => p.id));
    const porId = new Map((await this.repo.tarjetasDestacadas(elegidas.map((r) => r.id))).map((p) => [p.id, p]));

    const foto = (p) => this.storage.urlOptimizada(p.fotos[0].url, { anchoMaximo: DESTACADAS.anchoFoto });
    const data = [
      ...recientes.map((p) => formatearDestacada(p, 'reciente', { urlFoto: foto(p) })),
      ...elegidas
        .filter((r) => porId.has(r.id)) // por si dejó de estar publicada entre una consulta y otra
        .map((r) => formatearDestacada(porId.get(r.id), 'popular', { urlFoto: foto(porId.get(r.id)), favoritos: r.favoritos })),
    ];

    const datos = { data, total: data.length, generado_en: new Date(this.ahora()).toISOString() };
    this.cache = { datos, expira: this.ahora() + DESTACADAS.cacheMs };
    return datos;
  }

  invalidar() {
    this.cache = null;
  }
}
