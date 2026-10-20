import {
  coincideConFranja, dentroDeAnticipacion, diaSemana, enHoraLocal, generarHorarios, instanteLocal,
} from '../src/modules/agenda/agenda.tiempo.js';

// Lunes a viernes de 9:00 a 12:00 y sábado de 10:00 a 12:30 (hora de Guatemala)
const FRANJAS = [
  ...[1, 2, 3, 4, 5].map((d) => ({ dia_semana: d, hora_inicio: '09:00', hora_fin: '12:00' })),
  { dia_semana: 6, hora_inicio: '10:00', hora_fin: '12:30' },
];
// Lunes 19 de octubre de 2026, 8:00 en Guatemala (14:00 UTC)
const AHORA = new Date('2026-10-19T14:00:00Z');

describe('zona horaria de Guatemala (UTC-6)', () => {
  test('instanteLocal convierte la hora de Guatemala a UTC', () => {
    expect(instanteLocal('2026-10-20', '09:00').toISOString()).toBe('2026-10-20T15:00:00.000Z');
  });

  test('enHoraLocal cambia de día cuando en UTC ya es mañana', () => {
    // 2:00 UTC del 21 = 20:00 del 20 en Guatemala
    expect(enHoraLocal(new Date('2026-10-21T02:00:00Z'))).toEqual({ fecha: '2026-10-20', minutos: 20 * 60 });
  });

  test('diaSemana: 1 = lunes … 7 = domingo', () => {
    expect(diaSemana('2026-10-19')).toBe(1);
    expect(diaSemana('2026-10-25')).toBe(7);
  });
});

describe('generarHorarios', () => {
  const dias = generarHorarios(FRANJAS, { ahora: AHORA, dias: 7 });

  test('bloques de 60 minutos dentro de cada franja', () => {
    const martes = dias.find((d) => d.fecha === '2026-10-20');
    expect(martes.dia).toBe('martes');
    expect(martes.horarios.map((h) => h.hora)).toEqual(['09:00', '10:00', '11:00']);
  });

  test('una franja que no completa la hora final no genera ese bloque (sábado hasta 12:30)', () => {
    expect(dias.find((d) => d.dia === 'sábado').horarios.map((h) => h.hora)).toEqual(['10:00', '11:00']);
  });

  test('hoy solo ofrece horarios con al menos 2 horas de anticipación (son las 8:00)', () => {
    expect(dias.find((d) => d.fecha === '2026-10-19').horarios.map((h) => h.hora)).toEqual(['10:00', '11:00']);
  });

  test('el domingo, sin franjas, no aparece', () => {
    expect(dias.some((d) => d.dia === 'domingo')).toBe(false);
  });

  test('los horarios ocupados no se ofrecen', () => {
    const ocupado = instanteLocal('2026-10-20', '10:00').getTime();
    const conOcupado = generarHorarios(FRANJAS, { ahora: AHORA, dias: 7, ocupados: new Set([ocupado]) });
    expect(conOcupado.find((d) => d.fecha === '2026-10-20').horarios.map((h) => h.hora)).toEqual(['09:00', '11:00']);
  });
});

describe('validación de un horario pedido', () => {
  test('coincide con el inicio de un bloque', () => {
    expect(coincideConFranja(FRANJAS, instanteLocal('2026-10-20', '10:00'))).toBe(true);
  });

  test('no coincide a media hora, fuera de la franja ni en domingo', () => {
    expect(coincideConFranja(FRANJAS, instanteLocal('2026-10-20', '10:30'))).toBe(false);
    expect(coincideConFranja(FRANJAS, instanteLocal('2026-10-20', '12:00'))).toBe(false);
    expect(coincideConFranja(FRANJAS, instanteLocal('2026-10-25', '10:00'))).toBe(false);
  });

  test('anticipación: mínimo 2 horas, máximo 30 días', () => {
    expect(dentroDeAnticipacion(instanteLocal('2026-10-19', '09:00'), AHORA)).toBe(false);
    expect(dentroDeAnticipacion(instanteLocal('2026-10-19', '10:00'), AHORA)).toBe(true);
    expect(dentroDeAnticipacion(instanteLocal('2026-11-30', '10:00'), AHORA)).toBe(false);
  });
});
