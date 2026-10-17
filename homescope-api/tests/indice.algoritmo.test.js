import { readFileSync } from 'node:fs';
import {
  calcularIndice, calcularSubpuntaje, nivelSemaforo, validarPesos, valorPorDistancia,
} from '../src/modules/geo-indice/indice.algoritmo.js';

// Pesos v1.0 (los mismos que siembra la migración en categoria_interes)
const PESOS = { educacion: 0.20, salud: 0.20, comercio: 0.20, transporte: 0.15, seguridad: 0.15, areas_verdes: 0.10 };

// Casos reales de la sección 5.3 de docs/HomeScope_Indice_Conveniencia.md
const EJEMPLOS = JSON.parse(readFileSync(new URL('./fixtures/indice-ejemplos.json', import.meta.url), 'utf-8'));

describe('valorPorDistancia', () => {
  test.each([[0, 1], [100, 1], [500, 0.714], [800, 0.5], [1500, 0], [3000, 0]])('f(%i) = %d', (d, esperado) => {
    expect(valorPorDistancia(d)).toBeCloseTo(esperado, 3);
  });
});

describe('calcularSubpuntaje', () => {
  test('ejemplo 5.1: transporte en Jalapa zona 1 (519 m y 988 m)', () => {
    expect(calcularSubpuntaje([519, 988], 6)).toEqual({ puntaje: 43.92, cantidad_puntos: 2, distancia_minima_m: 519 });
  });

  test('una categoría sin lugares vale 0', () => {
    expect(calcularSubpuntaje([], 6)).toEqual({ puntaje: 0, cantidad_puntos: 0, distancia_minima_m: null });
  });

  test('la oferta se limita a 1 aunque haya muchos lugares', () => {
    expect(calcularSubpuntaje(Array(20).fill(50), 3).puntaje).toBe(100);
  });

  test('los lugares a 1.5 km o más no cuentan en cantidad_puntos', () => {
    expect(calcularSubpuntaje([400, 1499, 1500, 1900], 3).cantidad_puntos).toBe(2);
  });
});

describe('nivelSemaforo', () => {
  test.each([[100, 'verde'], [70, 'verde'], [69.99, 'amarillo'], [40, 'amarillo'], [39.99, 'rojo'], [0, 'rojo']])(
    '%d → %s', (puntaje, nivel) => expect(nivelSemaforo(puntaje)).toBe(nivel));
});

describe('validarPesos', () => {
  test('acepta los pesos v1.0 aunque la suma en flotante no sea exactamente 1', () => {
    expect(() => validarPesos(PESOS)).not.toThrow();
  });

  test('rechaza pesos que no suman 1.00', () => {
    expect(() => validarPesos({ ...PESOS, salud: 0.25 })).toThrow(/sumar 1.00 \(suman 1.05\)/);
  });

  test('rechaza una categoría sin cantidad de referencia', () => {
    expect(() => validarPesos({ ...PESOS, educacion: 0.10, cultura: 0.10 })).toThrow(/cultura/);
  });
});

describe('calcularIndice con datos reales', () => {
  test.each(Object.entries(EJEMPLOS))('%s', (_nombre, { distancias, esperado }) => {
    const resultado = calcularIndice(distancias, PESOS);
    expect(resultado.puntaje_total).toBe(esperado.puntaje_total);
    expect(resultado.nivel_semaforo).toBe(esperado.nivel_semaforo);
  });

  test('el total se reconstruye exacto desde el desglose (RNF-10)', () => {
    const { puntaje_total, subpuntajes } = calcularIndice(EJEMPLOS['Jalapa, zona 1'].distancias, PESOS);
    const suma = Object.entries(subpuntajes).reduce((s, [c, sub]) => s + PESOS[c] * sub.puntaje, 0);
    expect(Math.round(suma * 100) / 100).toBe(puntaje_total);
    expect(subpuntajes.transporte.puntaje).toBe(43.92);
  });

  test('la misma entrada da siempre el mismo resultado', () => {
    const { distancias } = EJEMPLOS.Monjas;
    expect(calcularIndice(distancias, PESOS)).toEqual(calcularIndice(structuredClone(distancias), PESOS));
  });
});
