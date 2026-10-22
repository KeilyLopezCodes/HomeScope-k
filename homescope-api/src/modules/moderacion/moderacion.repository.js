import { prisma } from '../../config/prisma.js';

export const ESTADOS_ABIERTOS = ['pendiente', 'en_revision'];

const REPORTE_SELECT = {
  id: true, tipo_objetivo: true, motivo: true, descripcion: true, estado: true, fecha_creacion: true,
  reportante: { select: { id: true, nombre: true } },
  comentario_zona: {
    select: {
      id: true, comentario: true, estado: true, fecha_creacion: true,
      usuario:   { select: { id: true, nombre: true } },
      propiedad: { select: { id: true, titulo: true } },
      // Cuántas personas lo tienen reportado ahora mismo (ayuda a priorizar la cola)
      _count: { select: { reportes: { where: { estado: { in: ESTADOS_ABIERTOS } } } } },
    },
  },
  propiedad: {
    select: {
      id: true, titulo: true, estado: true, vendedor_id: true,
      _count: { select: { reportes: { where: { estado: { in: ESTADOS_ABIERTOS } } } } },
    },
  },
  usuario_reportado: {
    select: {
      id: true, nombre: true, apellido: true, estado: true,
      _count: { select: { reportes_recibidos: { where: { estado: { in: ESTADOS_ABIERTOS } } } } },
    },
  },
};

const ACCION_SELECT = {
  id: true, accion: true, motivo: true, detalle: true, fecha_accion: true, reporte_id: true,
  administrador: { select: { id: true, nombre: true, apellido: true } },
  propiedad:     { select: { id: true, titulo: true, estado: true } },
  usuario:       { select: { id: true, nombre: true, apellido: true, estado: true } },
};

// Columna del objetivo de un reporte según su tipo
const COLUMNA_OBJETIVO = { comentario: 'comentario_zona_id', propiedad: 'propiedad_id', usuario: 'usuario_reportado_id' };

export class ModeracionRepository {
  // Ejecuta fn(tx) en una transacción: la acción y su registro se guardan juntos o no se guarda nada
  async enTransaccion(fn) {
    return prisma.$transaction(fn);
  }

  // tipo: comentario | propiedad | usuario; objetivoId: id del comentario, la propiedad o el usuario
  async crearReporte({ reportanteId, tipo, objetivoId, motivo, descripcion }) {
    return prisma.reporte.create({
      data: { reportante_id: reportanteId, tipo_objetivo: tipo, [COLUMNA_OBJETIVO[tipo]]: objetivoId, motivo, descripcion },
      select: REPORTE_SELECT,
    });
  }

  // Cola del administrador: los más antiguos primero (se atienden en orden de llegada)
  async listarReportes({ estado, tipo, page, pageSize }) {
    const where = { ...(estado && { estado }), ...(tipo && { tipo_objetivo: tipo }) };
    const [items, total, abiertos] = await prisma.$transaction([
      prisma.reporte.findMany({
        where,
        orderBy: [{ fecha_creacion: estado && !ESTADOS_ABIERTOS.includes(estado) ? 'desc' : 'asc' }, { id: 'asc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  REPORTE_SELECT,
      }),
      prisma.reporte.count({ where }),
      prisma.reporte.count({ where: { estado: { in: ESTADOS_ABIERTOS }, ...(tipo && { tipo_objetivo: tipo }) } }),
    ]);
    return { items, total, abiertos };
  }

  async buscarReporte(id) {
    return prisma.reporte.findUnique({ where: { id }, select: REPORTE_SELECT });
  }

  async cambiarEstado(id, estado, db = prisma) {
    return db.reporte.update({ where: { id }, data: { estado }, select: REPORTE_SELECT });
  }

  // Cierra (resuelto o descartado) todos los reportes abiertos de un objetivo → cuántos cerró
  // objetivo: { comentarioZonaId } | { propiedadId } | { usuarioId }
  async cerrarAbiertos({ comentarioZonaId, propiedadId, usuarioId }, estado, db = prisma) {
    const { count } = await db.reporte.updateMany({
      where: {
        estado: { in: ESTADOS_ABIERTOS },
        ...(comentarioZonaId && { comentario_zona_id: comentarioZonaId }),
        ...(propiedadId && { propiedad_id: propiedadId }),
        ...(usuarioId && { usuario_reportado_id: usuarioId }),
      },
      data: { estado },
    });
    return count;
  }

  async contarAbiertos({ propiedadId, usuarioId }) {
    return prisma.reporte.count({
      where: {
        estado: { in: ESTADOS_ABIERTOS },
        ...(propiedadId && { propiedad_id: propiedadId }),
        ...(usuarioId && { usuario_reportado_id: usuarioId }),
      },
    });
  }

  // ── Registro de acciones ────────────────────────────────────────────────────

  async registrarAccion({ administradorId, accion, motivo, reporteId = null, propiedadId = null, usuarioId = null, detalle = null }, db = prisma) {
    return db.accionModeracion.create({
      data: {
        administrador_id: administradorId, accion, motivo, reporte_id: reporteId,
        propiedad_id: propiedadId, usuario_id: usuarioId, detalle,
      },
      select: ACCION_SELECT,
    });
  }

  // Historial, lo más reciente primero
  async listarAcciones({ propiedad_id, usuario_id, administrador_id, accion, page, pageSize }) {
    const where = {
      ...(propiedad_id && { propiedad_id }),
      ...(usuario_id && { usuario_id }),
      ...(administrador_id && { administrador_id }),
      ...(accion && { accion }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.accionModeracion.findMany({
        where,
        orderBy: [{ fecha_accion: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  ACCION_SELECT,
      }),
      prisma.accionModeracion.count({ where }),
    ]);
    return { items, total };
  }

  // La acción más reciente de las indicadas sobre una propiedad o un usuario (o null)
  async ultimaAccion({ propiedadId, usuarioId }, acciones) {
    return prisma.accionModeracion.findFirst({
      where: {
        accion: { in: acciones },
        ...(propiedadId && { propiedad_id: propiedadId }),
        ...(usuarioId && { usuario_id: usuarioId }),
      },
      orderBy: [{ fecha_accion: 'desc' }, { id: 'desc' }],
      select:  { id: true, accion: true, detalle: true, fecha_accion: true },
    });
  }

  // Estadísticas: reportes abiertos por tipo y acciones del período por tipo
  async estadisticasModeracion(desde) {
    const [abiertos, acciones] = await Promise.all([
      prisma.reporte.groupBy({ by: ['tipo_objetivo'], where: { estado: { in: ESTADOS_ABIERTOS } }, _count: true }),
      prisma.accionModeracion.groupBy({ by: ['accion'], where: { fecha_accion: { gte: desde } }, _count: true }),
    ]);
    return {
      reportesAbiertos: Object.fromEntries(abiertos.map((g) => [g.tipo_objetivo, g._count])),
      acciones:         Object.fromEntries(acciones.map((g) => [g.accion, g._count])),
    };
  }

  // Publicaciones cuya última decisión de moderación fue pausarlas (las que el administrador puede aprobar)
  async idsPausadasPorModeracion() {
    const filas = await prisma.$queryRaw`
      SELECT propiedad_id FROM (
        SELECT DISTINCT ON (propiedad_id) propiedad_id, accion
          FROM accion_moderacion
         WHERE propiedad_id IS NOT NULL AND accion IN ('pausar', 'aprobar')
         ORDER BY propiedad_id, fecha_accion DESC, id DESC
      ) ultimas
      WHERE accion = 'pausar'`;
    return filas.map((f) => f.propiedad_id);
  }

  // ── Verificación de vendedores ──────────────────────────────────────────────

  async crearVerificacion({ usuarioId, tipoDocumento, documentoRef }) {
    return prisma.verificacionVendedor.create({
      data: { usuario_id: usuarioId, tipo_documento: tipoDocumento, documento_url: documentoRef },
    });
  }

  async ultimaVerificacion(usuarioId) {
    return prisma.verificacionVendedor.findFirst({
      where:   { usuario_id: usuarioId },
      orderBy: [{ fecha_solicitud: 'desc' }, { id: 'desc' }],
    });
  }

  // Verificado = tiene alguna solicitud aprobada
  async vendedorVerificado(usuarioId) {
    return (await prisma.verificacionVendedor.count({ where: { usuario_id: usuarioId, estado: 'aprobada' } })) > 0;
  }

  async buscarVerificacion(id) {
    return prisma.verificacionVendedor.findUnique({ where: { id } });
  }

  // Cola del administrador: las pendientes de la más antigua a la más reciente; las revisadas, al revés
  async listarVerificaciones({ estado, id, page, pageSize }) {
    const where = { ...(estado && { estado }), ...(id && { id }) };
    const [items, total] = await prisma.$transaction([
      prisma.verificacionVendedor.findMany({
        where,
        orderBy: [{ fecha_solicitud: estado === 'pendiente' ? 'asc' : 'desc' }, { id: 'asc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        include: {
          usuario: {
            select: {
              id: true, nombre: true, apellido: true, email: true, estado: true, fecha_registro: true,
              _count: { select: { propiedades: true } },
            },
          },
          revisor: { select: { id: true, nombre: true, apellido: true } },
        },
      }),
      prisma.verificacionVendedor.count({ where }),
    ]);
    return { items, total };
  }

  // Solo se revisa una pendiente (si otro administrador ya la revisó, no cambia nada) → si se revisó
  async resolverVerificacion(id, { estado, revisadoPor, motivo }) {
    const { count } = await prisma.verificacionVendedor.updateMany({
      where: { id, estado: 'pendiente' },
      data:  { estado, revisado_por: revisadoPor, motivo_rechazo: estado === 'rechazada' ? motivo : null, fecha_revision: new Date() },
    });
    return count > 0;
  }
}
