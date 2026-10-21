import {
  rangoPeriodo, armarSerie, diasActivos, evaluarDesempeno, tasaInteres, umbralSinInteres,
} from '../src/modules/propiedades/propiedades.estadisticas.js';

// Martes 20 de octubre de 2026, 23:30 en Guatemala (05:30 UTC del 21)
const AHORA = new Date('2026-10-21T05:30:00Z');
const DIA = 24 * 60 * 60 * 1000;
const haceDias = (n) => new Date(AHORA.getTime() - n * DIA);

// Publicada hace 60 días, completa (fotos, descripción y ubicación) y vigente
const PROPIEDAD = {
  estado: 'publicado', fecha_publicacion: haceDias(60), fecha_expiracion: new Date(AHORA.getTime() + 30 * DIA),
  descripcion: 'x'.repeat(200), latitud: 14.6, longitud: -90.5, total_fotos: 6,
};
const SIN_ACTIVIDAD = { vistas: 0, favoritos: 0, contactos: 0, mensajes_sin_leer: 0 };
const codigos = (r) => r.sugerencias.map((s) => s.codigo);

describe('período y serie diaria', () => {
  test('rangoPeriodo usa los días de Guatemala, hoy incluido', () => {
    const { fechas, desde } = rangoPeriodo(7, AHORA);
    expect(fechas).toEqual(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']);
    expect(desde.toISOString()).toBe('2026-10-14T06:00:00.000Z'); // medianoche en UTC−6
  });

  test('armarSerie rellena con 0 los días sin actividad', () => {
    const serie = armarSerie(['2026-10-19', '2026-10-20'], {
      vistas: new Map([['2026-10-20', 5]]), favoritos: new Map(), mensajes: new Map([['2026-10-19', 2]]),
    });
    expect(serie).toEqual([
      { fecha: '2026-10-19', vistas: 0, favoritos: 0, mensajes: 2 },
      { fecha: '2026-10-20', vistas: 5, favoritos: 0, mensajes: 0 },
    ]);
  });

  test('diasActivos no pasa del período ni baja de 1', () => {
    expect(diasActivos(PROPIEDAD, 30, AHORA)).toBe(30);
    expect(diasActivos({ fecha_publicacion: haceDias(10) }, 90, AHORA)).toBe(10);
    expect(diasActivos({ fecha_publicacion: AHORA }, 7, AHORA)).toBe(1);
  });

  test('tasaInteres es el % de vistas que terminaron en favorito o primer mensaje', () => {
    expect(tasaInteres({ vistas: 40, favoritos: 3, contactos: 1 })).toBe(10);
    expect(tasaInteres({ vistas: 0, favoritos: 0, contactos: 0 })).toBeNull();
  });
});

describe('sugerencias ante bajo desempeño', () => {
  const opciones = { dias: 30, promedioVistasDia: 2, ahora: AHORA };

  test('con vistas e interés normales no hay sugerencias', () => {
    const r = evaluarDesempeno(PROPIEDAD, { ...SIN_ACTIVIDAD, vistas: 60, favoritos: 2, contactos: 1 }, opciones);
    expect(r).toEqual({ desempeno: 'normal', sugerencias: [] });
  });

  test('pocas vistas frente al promedio → bajo, con consejos según lo que le falta', () => {
    const incompleta = { ...PROPIEDAD, total_fotos: 2, descripcion: 'Casa bonita', latitud: null };
    const r = evaluarDesempeno(incompleta, { ...SIN_ACTIVIDAD, vistas: 20 }, opciones); // 0.7 al día < 1 (mitad de 2)
    expect(r.desempeno).toBe('bajo');
    expect(codigos(r)).toEqual(['POCAS_VISTAS', 'POCAS_FOTOS', 'DESCRIPCION_CORTA', 'SIN_UBICACION', 'REVISAR_TITULO']);
  });

  test('una propiedad completa con pocas vistas solo recibe el aviso y revisar el título', () => {
    const r = evaluarDesempeno(PROPIEDAD, { ...SIN_ACTIVIDAD, vistas: 3 }, opciones);
    expect(codigos(r)).toEqual(['POCAS_VISTAS', 'REVISAR_TITULO']);
  });

  test('se compara por día publicada: 12 vistas en 10 días no es bajo aunque el período sea de 90', () => {
    const reciente = { ...PROPIEDAD, fecha_publicacion: haceDias(10) };
    const r = evaluarDesempeno(reciente, { ...SIN_ACTIVIDAD, vistas: 12, favoritos: 1 }, { ...opciones, dias: 90 });
    expect(r.desempeno).toBe('normal');
  });

  test('muchas vistas sin favoritos ni mensajes → revisar precio y portada', () => {
    const r = evaluarDesempeno(PROPIEDAD, { ...SIN_ACTIVIDAD, vistas: 45 }, opciones);
    expect(r.desempeno).toBe('bajo');
    expect(codigos(r)).toEqual(['SIN_INTERES']);
    // con un solo favorito ya no aplica
    expect(evaluarDesempeno(PROPIEDAD, { ...SIN_ACTIVIDAD, vistas: 45, favoritos: 1 }, opciones).desempeno).toBe('normal');
  });

  test('el umbral de "sin interés" se escala a los días publicada, con un mínimo de 25', () => {
    expect(umbralSinInteres(7)).toBe(25);
    expect(umbralSinInteres(30)).toBe(40);
    expect(umbralSinInteres(90)).toBe(120);
  });

  test('una publicada hace menos de 3 días todavía no se evalúa', () => {
    const r = evaluarDesempeno({ ...PROPIEDAD, fecha_publicacion: haceDias(1) }, SIN_ACTIVIDAD, opciones);
    expect(r).toEqual({ desempeno: 'nueva', sugerencias: [] });
  });

  test('avisa de mensajes sin leer y de un anuncio por vencer', () => {
    const porVencer = { ...PROPIEDAD, fecha_expiracion: new Date(AHORA.getTime() + 3 * DIA) };
    const r = evaluarDesempeno(porVencer, { ...SIN_ACTIVIDAD, vistas: 60, favoritos: 2, mensajes_sin_leer: 2 }, opciones);
    expect(r.desempeno).toBe('normal');
    expect(codigos(r)).toEqual(['MENSAJES_SIN_LEER', 'POR_VENCER']);
    expect(r.sugerencias[1].mensaje).toContain('vence en 3 días');
  });

  test('pausadas y cerradas no se evalúan por vistas', () => {
    expect(evaluarDesempeno({ ...PROPIEDAD, estado: 'pausado' }, SIN_ACTIVIDAD, opciones))
      .toEqual({ desempeno: 'pausada', sugerencias: [expect.objectContaining({ codigo: 'PAUSADA' })] });
    expect(evaluarDesempeno({ ...PROPIEDAD, estado: 'vendido' }, SIN_ACTIVIDAD, opciones))
      .toEqual({ desempeno: 'cerrada', sugerencias: [] });
  });
});
