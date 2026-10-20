/**
 * seed-agenda.js — Datos de prueba de disponibilidad y visitas
 *
 * Disponibilidad (hora de Guatemala):
 *   - catalogo@prueba.com  → lunes a viernes 09:00–12:00 y 14:00–18:00; sábado 09:00–13:00
 *   - vendedor@prueba.com  → martes y jueves 15:00–18:00
 *
 * Visitas sobre propiedades publicadas de catalogo@prueba.com, una por estado:
 *   - 2 solicitadas (esperan que el vendedor confirme o reprograme)
 *   - 1 confirmada en el horario libre más próximo → si cae dentro de 24 h sirve para probar
 *     `npm run visitas:recordatorios`
 *   - 1 reprogramada (pedida para un horario y movida por el vendedor a otro)
 *   - 1 cancelada
 *   - 1 confirmada en el pasado (historial, con recordatorio ya enviado)
 * Además crea las notificaciones que esas visitas habrían generado.
 *
 * Los horarios se calculan con las mismas funciones de la API (agenda.tiempo.js), así que siempre
 * son válidos y futuros respecto al momento de ejecutar el seed.
 *
 * Es re-ejecutable y solo toca sus propios datos: la disponibilidad de esos dos vendedores y las
 * visitas (con sus notificaciones) de las propiedades de catalogo@prueba.com.
 *
 * Ejecutar:
 *   npm run db:seed:agenda
 */

import { PrismaClient } from '@prisma/client';
import {
  NOMBRES_DIA, fechaHoraLegible, generarHorarios, horaParaBD, instanteLocal, enHoraLocal,
} from '../src/modules/agenda/agenda.tiempo.js';

const prisma = new PrismaClient();

const DISPONIBILIDAD = {
  'catalogo@prueba.com': [
    ...[1, 2, 3, 4, 5].flatMap((d) => [
      { dia_semana: d, hora_inicio: '09:00', hora_fin: '12:00' },
      { dia_semana: d, hora_inicio: '14:00', hora_fin: '18:00' },
    ]),
    { dia_semana: 6, hora_inicio: '09:00', hora_fin: '13:00' },
  ],
  'vendedor@prueba.com': [
    { dia_semana: 2, hora_inicio: '15:00', hora_fin: '18:00' },
    { dia_semana: 4, hora_inicio: '15:00', hora_fin: '18:00' },
  ],
};

const COMPRADORES = ['comprador-sin@prueba.com', 'comprador-con@prueba.com', 'vendedor@prueba.com'];

async function usuarioPorCorreo(email) {
  const u = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nombre: true, email: true } });
  if (!u) throw new Error(`Falta el usuario ${email}. Ejecuta antes npm run db:seed:prueba y npm run db:seed:catalogo`);
  return u;
}

async function main() {
  const vendedor = await usuarioPorCorreo('catalogo@prueba.com');
  const [compradorSin, compradorCon, otroComprador] = await Promise.all(COMPRADORES.map(usuarioPorCorreo));

  // ── 1. Disponibilidad ──────────────────────────────────────────────────────
  for (const [email, franjas] of Object.entries(DISPONIBILIDAD)) {
    const { id } = await usuarioPorCorreo(email);
    await prisma.$transaction([
      prisma.disponibilidadVendedor.deleteMany({ where: { vendedor_id: id, propiedad_id: null } }),
      prisma.disponibilidadVendedor.createMany({
        data: franjas.map((f) => ({
          vendedor_id: id, dia_semana: f.dia_semana,
          hora_inicio: horaParaBD(f.hora_inicio), hora_fin: horaParaBD(f.hora_fin),
        })),
      }),
    ]);
    console.log(`🗓️  ${email}: ${franjas.length} franjas de disponibilidad`);
  }

  // ── 2. Limpiar visitas anteriores del seed ─────────────────────────────────
  const propiedades = await prisma.propiedad.findMany({
    where: { vendedor_id: vendedor.id, estado: 'publicado' },
    orderBy: { id: 'asc' },
    take: 6,
    select: { id: true, titulo: true },
  });
  if (propiedades.length < 6) throw new Error('catalogo@prueba.com necesita 6 propiedades publicadas: ejecuta npm run db:seed:catalogo');

  const anteriores = await prisma.visita.findMany({
    where: { propiedad: { vendedor_id: vendedor.id } }, select: { id: true },
  });
  const idsAnteriores = anteriores.map((v) => v.id);
  if (idsAnteriores.length) {
    await prisma.notificacion.deleteMany({ where: { referencia_tipo: 'visita', referencia_id: { in: idsAnteriores } } });
    await prisma.visita.deleteMany({ where: { id: { in: idsAnteriores } } });
    console.log(`🧹 ${idsAnteriores.length} visitas anteriores (y sus notificaciones) eliminadas`);
  }

  // ── 3. Horarios libres reales del vendedor ─────────────────────────────────
  const dias = generarHorarios(DISPONIBILIDAD['catalogo@prueba.com'], { dias: 14 });
  const horarios = dias.flatMap((d) => d.horarios.map((h) => h.inicio));
  // Un horario distinto por visita: el más próximo y luego uno por día a partir del segundo día
  const elDia = (n, i = 0) => dias[Math.min(n, dias.length - 1)].horarios[i].inicio;
  const masProximo = horarios[0];

  const [p1, p2, p3, p4, p5, p6] = propiedades;
  const hoy = enHoraLocal(new Date()).fecha;
  const haceTresDias = instanteLocal(
    new Date(new Date(`${hoy}T12:00:00Z`).getTime() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10), '10:00');

  const VISITAS = [
    { nombre: 'solicitada', propiedad: p1, comprador: compradorSin, solicitada: elDia(1, 0), estado: 'solicitada',
      nota: 'Me interesa ver la cocina y el patio.' },
    { nombre: 'solicitada', propiedad: p2, comprador: compradorCon, solicitada: elDia(2, 1), estado: 'solicitada',
      nota: 'Llego con mi pareja.' },
    { nombre: 'confirmada (próxima)', propiedad: p3, comprador: compradorCon, solicitada: masProximo, confirmada: masProximo,
      estado: 'confirmada' },
    { nombre: 'reprogramada', propiedad: p4, comprador: compradorSin, solicitada: elDia(3, 0), confirmada: elDia(4, 2),
      estado: 'reprogramada', nota: '¿Se puede ver por la mañana?' },
    { nombre: 'cancelada', propiedad: p5, comprador: otroComprador, solicitada: elDia(5, 1), estado: 'cancelada' },
    { nombre: 'confirmada (pasada)', propiedad: p6, comprador: compradorSin, solicitada: haceTresDias, confirmada: haceTresDias,
      estado: 'confirmada', recordatorio: true },
  ];

  // ── 4. Visitas y sus notificaciones ────────────────────────────────────────
  console.log('\n🏠 Visitas creadas:');
  for (const v of VISITAS) {
    const visita = await prisma.visita.create({
      data: {
        propiedad_id: v.propiedad.id, comprador_id: v.comprador.id,
        fecha_hora_solicitada: v.solicitada, fecha_hora_confirmada: v.confirmada ?? null,
        estado: v.estado, nota_comprador: v.nota ?? null, recordatorio_enviado: Boolean(v.recordatorio),
      },
      select: { id: true },
    });

    const cuando = fechaHoraLegible(v.confirmada ?? v.solicitada);
    const ref = { referencia_tipo: 'visita', referencia_id: visita.id, tipo: 'visita' };
    const notificaciones = {
      solicitada:   [{ usuario_id: vendedor.id, titulo: 'Nueva solicitud de visita',
                       contenido: `${v.comprador.nombre} quiere visitar "${v.propiedad.titulo}" el ${cuando}` }],
      confirmada:   [{ usuario_id: v.comprador.id, titulo: 'Visita confirmada', leida: Boolean(v.recordatorio),
                       contenido: `Tu visita a "${v.propiedad.titulo}" quedó confirmada para el ${cuando}` }],
      reprogramada: [{ usuario_id: v.comprador.id, titulo: 'Visita reprogramada',
                       contenido: `${vendedor.nombre} reprogramó tu visita a "${v.propiedad.titulo}" para el ${cuando}` }],
      cancelada:    [{ usuario_id: vendedor.id, titulo: 'Visita cancelada',
                       contenido: `${v.comprador.nombre} canceló la visita a "${v.propiedad.titulo}" del ${cuando}` }],
    }[v.estado];
    await prisma.notificacion.createMany({
      data: notificaciones.map((n) => ({ ...ref, ...n, contenido: n.contenido.endsWith('.') ? n.contenido : `${n.contenido}.` })),
    });

    const { fecha, minutos } = enHoraLocal(v.confirmada ?? v.solicitada);
    const dia = NOMBRES_DIA[(new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7];
    console.log(`   #${String(visita.id).padEnd(4)} ${v.nombre.padEnd(21)} ${dia.padEnd(9)} ${fecha} ${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
      + `  propiedad ${v.propiedad.id} · ${v.comprador.email}`);
  }

  const horasHastaProxima = ((masProximo.getTime() - Date.now()) / 3600000).toFixed(1);
  console.log(`\n✅ Listo. La visita confirmada más próxima es en ${horasHastaProxima} h`
    + (horasHastaProxima <= 24 ? ': npm run visitas:recordatorios le enviará su recordatorio.' : ' (más de 24 h: su recordatorio saldrá cuando falten 24 h).'));
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
