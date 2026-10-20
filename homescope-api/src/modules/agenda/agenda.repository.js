import { prisma } from '../../config/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { horaParaBD } from './agenda.tiempo.js';
import { ESTADOS_ACTIVOS } from './agenda.schemas.js';

// De los participantes solo se exponen id y nombre (RNF-08)
const USUARIO_PUBLICO = { select: { id: true, nombre: true } };

const VISITA_SELECT = {
  id: true, estado: true, fecha_hora_solicitada: true, fecha_hora_confirmada: true,
  nota_comprador: true, recordatorio_enviado: true, fecha_creacion: true, fecha_actualizacion: true,
  comprador: USUARIO_PUBLICO,
  propiedad: {
    select: { id: true, titulo: true, direccion: true, municipio: true, vendedor: USUARIO_PUBLICO },
  },
};

// Hora efectiva de una visita: la confirmada (o reprogramada) si existe; si no, la solicitada
const horaEfectiva = (v) => v.fecha_hora_confirmada ?? v.fecha_hora_solicitada;

// Una escritura que compite por el mismo horario y pierde (aislamiento serializable): P2034
const esConflicto = (err) => err?.code === 'P2034';

export class AgendaRepository {
  // ── Disponibilidad ─────────────────────────────────────────────────────────

  // Franjas generales del vendedor (propiedad_id null), ordenadas por día y hora
  async listarFranjas(vendedorId) {
    return prisma.disponibilidadVendedor.findMany({
      where:   { vendedor_id: vendedorId, propiedad_id: null, activa: true },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
      select:  { id: true, dia_semana: true, hora_inicio: true, hora_fin: true },
    });
  }

  async reemplazarFranjas(vendedorId, franjas) {
    return prisma.$transaction([
      prisma.disponibilidadVendedor.deleteMany({ where: { vendedor_id: vendedorId, propiedad_id: null } }),
      prisma.disponibilidadVendedor.createMany({
        data: franjas.map((f) => ({
          vendedor_id: vendedorId,
          dia_semana:  f.dia_semana,
          hora_inicio: horaParaBD(f.hora_inicio),
          hora_fin:    horaParaBD(f.hora_fin),
        })),
      }),
    ]);
  }

  // ── Horarios ocupados ──────────────────────────────────────────────────────

  // Instantes (ms) ya tomados por visitas activas en cualquier propiedad del vendedor
  async horariosOcupados(vendedorId, { desde = new Date(), excluirVisitaId = null, tx = prisma } = {}) {
    const visitas = await tx.visita.findMany({
      where: {
        estado:    { in: ESTADOS_ACTIVOS },
        propiedad: { vendedor_id: vendedorId },
        ...(excluirVisitaId && { id: { not: excluirVisitaId } }),
        OR: [{ fecha_hora_confirmada: { gte: desde } }, { fecha_hora_confirmada: null, fecha_hora_solicitada: { gte: desde } }],
      },
      select: { fecha_hora_solicitada: true, fecha_hora_confirmada: true },
    });
    return new Set(visitas.map((v) => horaEfectiva(v).getTime()));
  }

  // ── Visitas ────────────────────────────────────────────────────────────────

  // Crea la visita solo si el horario sigue libre y el comprador no tiene otra activa en esa propiedad.
  // Con aislamiento serializable, dos solicitudes simultáneas del mismo horario no pueden ganar las dos.
  async crearVisitaSiLibre({ propiedadId, vendedorId, compradorId, fechaHora, nota }) {
    try {
      return await prisma.$transaction(async (tx) => {
        const activa = await tx.visita.findFirst({
          where:  { propiedad_id: propiedadId, comprador_id: compradorId, estado: { in: ESTADOS_ACTIVOS } },
          select: { id: true },
        });
        if (activa)
          throw new AppError('VISITA_ACTIVA', 'Ya tienes una visita pendiente o confirmada para esta propiedad', 409, [{ visita_id: activa.id }]);

        const ocupados = await this.horariosOcupados(vendedorId, { tx });
        if (ocupados.has(fechaHora.getTime()))
          throw new AppError('HORARIO_OCUPADO', 'Ese horario ya fue tomado. Elige otro.', 409);

        return tx.visita.create({
          data:   { propiedad_id: propiedadId, comprador_id: compradorId, fecha_hora_solicitada: fechaHora, nota_comprador: nota || null },
          select: VISITA_SELECT,
        });
      }, { isolationLevel: 'Serializable' });
    } catch (err) {
      if (esConflicto(err)) throw new AppError('HORARIO_OCUPADO', 'Ese horario ya fue tomado. Elige otro.', 409);
      throw err;
    }
  }

  async buscarVisita(id) {
    return prisma.visita.findUnique({ where: { id }, select: VISITA_SELECT });
  }

  // Cambia el estado. Al confirmar o reprogramar se reinicia el recordatorio (cambió la hora de la visita).
  // Reprogramar comprueba en la misma transacción que el nuevo horario siga libre.
  async actualizarVisita(id, { estado, fechaHoraConfirmada, vendedorId }) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (estado === 'reprogramada') {
          const ocupados = await this.horariosOcupados(vendedorId, { tx, excluirVisitaId: id });
          if (ocupados.has(fechaHoraConfirmada.getTime()))
            throw new AppError('HORARIO_OCUPADO', 'Ya tienes otra visita en ese horario. Elige otro.', 409);
        }
        return tx.visita.update({
          where: { id },
          data: {
            estado,
            ...(fechaHoraConfirmada && { fecha_hora_confirmada: fechaHoraConfirmada, recordatorio_enviado: false }),
          },
          select: VISITA_SELECT,
        });
      }, { isolationLevel: 'Serializable' });
    } catch (err) {
      if (esConflicto(err)) throw new AppError('HORARIO_OCUPADO', 'Ya tienes otra visita en ese horario. Elige otro.', 409);
      throw err;
    }
  }

  // Visitas del usuario como comprador, como vendedor (dueño de la propiedad) o ambas
  async listarVisitas(usuarioId, { rol, estado, page, pageSize }) {
    const comoComprador = { comprador_id: usuarioId };
    const comoVendedor  = { propiedad: { vendedor_id: usuarioId } };
    const where = {
      ...(rol === 'comprador' ? comoComprador : rol === 'vendedor' ? comoVendedor : { OR: [comoComprador, comoVendedor] }),
      ...(estado && { estado }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.visita.findMany({
        where,
        orderBy: [{ fecha_hora_solicitada: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  VISITA_SELECT,
      }),
      prisma.visita.count({ where }),
    ]);
    return { items, total };
  }

  // ── Recordatorios ──────────────────────────────────────────────────────────

  // Visitas confirmadas o reprogramadas entre ahora y `hasta` que aún no tienen recordatorio.
  // Incluye los correos de los dos participantes: solo para enviarles el recordatorio, nunca se exponen.
  async visitasParaRecordar(ahora, hasta) {
    return prisma.visita.findMany({
      where: {
        estado: { in: ['confirmada', 'reprogramada'] },
        recordatorio_enviado: false,
        fecha_hora_confirmada: { gt: ahora, lte: hasta },
      },
      select: {
        id: true, fecha_hora_confirmada: true,
        comprador: { select: { id: true, nombre: true, email: true } },
        propiedad: {
          select: {
            id: true, titulo: true, direccion: true, municipio: true,
            vendedor: { select: { id: true, nombre: true, email: true } },
          },
        },
      },
    });
  }

  async marcarRecordatorioEnviado(id) {
    return prisma.visita.update({ where: { id }, data: { recordatorio_enviado: true }, select: { id: true } });
  }
}

export { horaEfectiva };
