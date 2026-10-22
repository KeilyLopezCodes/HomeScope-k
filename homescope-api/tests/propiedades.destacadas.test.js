import {
  DESTACADAS, DestacadasService, formatearDestacada, seleccionarPopulares, ubicacionResumida,
} from '../src/modules/propiedades/propiedades.destacadas.js';
import { LocalStorageStrategy } from '../src/shared/adapters/storage/local.strategy.js';
import { CloudinaryStorageStrategy } from '../src/shared/adapters/storage/cloudinary.strategy.js';

// Propiedad publicada con portada, como la devuelve el repositorio
const propiedad = (id, extra = {}) => ({
  id, titulo: `Propiedad ${id}`, precio: String(100000 + id), moneda: 'GTQ', modalidad: 'venta',
  zona: 'Zona 1', municipio: 'Jalapa', departamento: 'Jalapa', direccion: `Calle ${id}`,
  fotos: [{ url: `https://res.cloudinary.com/homescope/image/upload/v1/propiedades/${id}/portada.jpg` }],
  ...extra,
});

// Repositorio en memoria: recientes ya ordenadas y ranking [{ id, favoritos }] ya ordenado, como los da la BD
function repoFalso({ recientes, ranking }) {
  const todas = new Map([...recientes, ...ranking.map((r) => propiedad(r.id))].map((p) => [p.id, p]));
  const llamadas = { recientes: 0, ranking: 0, tarjetas: 0 };
  return {
    llamadas,
    recientesConPortada: async (limite) => { llamadas.recientes++; return recientes.slice(0, limite); },
    rankingFavoritos:    async (limite) => { llamadas.ranking++; return ranking.slice(0, limite); },
    tarjetasDestacadas:  async (ids) => { llamadas.tarjetas++; return ids.map((id) => todas.get(id)).filter(Boolean); },
  };
}
const storage = new CloudinaryStorageStrategy({ url: 'cloudinary://k:s@homescope' });
const servicio = (datos, ahora) => {
  const repo = repoFalso(datos);
  return { repo, s: new DestacadasService({ repo, storage, ...(ahora && { ahora }) }) };
};
const resumen = (r) => r.data.map((p) => `${p.motivo}:${p.id}`);

describe('GET /propiedades/destacadas — selección', () => {
  test('caso normal: 3 recientes y luego las 3 con más favoritos, con su motivo', async () => {
    const { s } = servicio({
      recientes: [propiedad(10), propiedad(9), propiedad(8)],
      ranking:   [{ id: 3, favoritos: 9 }, { id: 5, favoritos: 7 }, { id: 1, favoritos: 4 }, { id: 2, favoritos: 1 }],
    });
    const r = await s.obtener();
    expect(resumen(r)).toEqual(['reciente:10', 'reciente:9', 'reciente:8', 'popular:3', 'popular:5', 'popular:1']);
    expect(r.total).toBe(6);
    expect(r.data[3]).toMatchObject({ motivo: 'popular', favoritos: 9 });
    expect(r.data[0]).not.toHaveProperty('favoritos');
  });

  test('duplicados: una popular que ya está entre las recientes se omite y entra la siguiente del ranking', async () => {
    const { s } = servicio({
      recientes: [propiedad(10), propiedad(9), propiedad(8)],
      // 9 y 10 son las más populares, pero ya salen como recientes
      ranking:   [{ id: 9, favoritos: 12 }, { id: 3, favoritos: 8 }, { id: 10, favoritos: 6 }, { id: 4, favoritos: 5 }, { id: 2, favoritos: 2 }],
    });
    const r = await s.obtener();
    expect(resumen(r)).toEqual(['reciente:10', 'reciente:9', 'reciente:8', 'popular:3', 'popular:4', 'popular:2']);
    expect(new Set(r.data.map((p) => p.id)).size).toBe(r.data.length);
  });

  test('aunque las 3 recientes sean también las más populares, quedan 3 populares distintas', async () => {
    const { s, repo } = servicio({
      recientes: [propiedad(10), propiedad(9), propiedad(8)],
      ranking:   [10, 9, 8, 7, 6, 5].map((id, i) => ({ id, favoritos: 20 - i })),
    });
    const r = await s.obtener();
    expect(resumen(r)).toEqual(['reciente:10', 'reciente:9', 'reciente:8', 'popular:7', 'popular:6', 'popular:5']);
    expect(repo.llamadas.ranking).toBe(1); // una sola consulta agregada, con margen para los duplicados
  });

  test('menos de 6 disponibles: devuelve las que hay, sin rellenar', async () => {
    const { s } = servicio({
      recientes: [propiedad(2), propiedad(1)],
      ranking:   [{ id: 1, favoritos: 3 }],     // la única con favoritos ya es reciente
    });
    const r = await s.obtener();
    expect(resumen(r)).toEqual(['reciente:2', 'reciente:1']);
    expect(r.total).toBe(2);
  });

  test('sin propiedades publicadas con portada: lista vacía', async () => {
    const { s } = servicio({ recientes: [], ranking: [] });
    expect(await s.obtener()).toMatchObject({ data: [], total: 0 });
  });

  test('las propiedades sin favoritos no cuentan como populares', () => {
    expect(seleccionarPopulares([{ id: 4, favoritos: 2 }, { id: 5, favoritos: 0 }], [], 3)).toEqual([{ id: 4, favoritos: 2 }]);
  });
});

describe('formato de cada propiedad', () => {
  test('incluye motivo, id, título, precio, modalidad, ubicación resumida y la foto', async () => {
    const { s } = servicio({ recientes: [propiedad(7)], ranking: [] });
    const [p] = (await s.obtener()).data;
    expect(Object.keys(p).sort()).toEqual(['foto_url', 'id', 'modalidad', 'moneda', 'motivo', 'precio', 'titulo', 'ubicacion']);
    expect(p).toMatchObject({ motivo: 'reciente', id: 7, titulo: 'Propiedad 7', precio: '100007', modalidad: 'venta', ubicacion: 'Zona 1, Jalapa, Jalapa' });
  });

  test('ubicación resumida: zona, municipio y departamento; si no hay, la dirección', () => {
    expect(ubicacionResumida({ zona: null, municipio: 'Mixco', departamento: 'Guatemala', direccion: 'x' })).toBe('Mixco, Guatemala');
    expect(ubicacionResumida({ zona: ' ', municipio: null, departamento: null, direccion: 'Calle 5' })).toBe('Calle 5');
  });

  test('la foto de Cloudinary viene con formato y calidad automáticos y ancho máximo de 1600 px', async () => {
    const { s } = servicio({ recientes: [propiedad(7)], ranking: [] });
    const [p] = (await s.obtener()).data;
    expect(p.foto_url).toBe('https://res.cloudinary.com/homescope/image/upload/f_auto,q_auto,c_limit,w_1600/v1/propiedades/7/portada.jpg');
  });

  test('con el almacenamiento local, la foto de /uploads pide la versión optimizada', () => {
    const local = new LocalStorageStrategy({ directorio: 'uploads', directorioPrivado: 'uploads-privados', baseUrl: 'http://localhost:3000' });
    expect(local.urlOptimizada('http://localhost:3000/uploads/propiedades/7/a.jpg', { anchoMaximo: DESTACADAS.anchoFoto }))
      .toBe('http://localhost:3000/uploads/propiedades/7/a.jpg?w=1600&f=auto&q=auto');
    // Las de otros orígenes no son nuestras: se dejan igual
    expect(local.urlOptimizada('https://picsum.photos/seed/x/1200/800', { anchoMaximo: 1600 })).toBe('https://picsum.photos/seed/x/1200/800');
  });

  test('formatearDestacada solo agrega favoritos a las populares', () => {
    expect(formatearDestacada(propiedad(1), 'popular', { urlFoto: 'u', favoritos: 4 }).favoritos).toBe(4);
    expect(formatearDestacada(propiedad(1), 'reciente', { urlFoto: 'u' })).not.toHaveProperty('favoritos');
  });
});

describe('caché de 5 minutos', () => {
  test('dentro de los 5 minutos no vuelve a consultar; después sí', async () => {
    let reloj = 1_000_000;
    const { s, repo } = servicio({ recientes: [propiedad(1)], ranking: [] }, () => reloj);
    await s.obtener();
    reloj += DESTACADAS.cacheMs - 1;
    await s.obtener();
    expect(repo.llamadas.recientes).toBe(1);
    reloj += 2;
    await s.obtener();
    expect(repo.llamadas.recientes).toBe(2);
  });
});
