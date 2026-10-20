// Moderación: reportes de usuarios y su atención por el administrador
import { AppError } from '../../shared/errors/AppError.js';
import { ModeracionRepository } from './moderacion.repository.js';
import { ReputacionRepository } from '../reputacion/reputacion.repository.js';

const repo = new ModeracionRepository();
const reputacionRepo = new ReputacionRepository();

const ROLES_ADMIN = ['administrador', 'admin'];

// Reporte → forma de la cola del administrador
function formatearReporte(r) {
  const c = r.comentario_zona;
  return {
    id:             r.id,
    tipo_objetivo:  r.tipo_objetivo,
    motivo:         r.motivo,
    descripcion:    r.descripcion,
    estado:         r.estado,
    fecha_creacion: r.fecha_creacion,
    reportante:     r.reportante,
    ...(c && {
      comentario: {
        id:                  c.id,
        texto:               c.comentario,
        estado:              c.estado,
        fecha_creacion:      c.fecha_creacion,
        autor:               c.usuario,
        propiedad:           c.propiedad,
        reportes_abiertos:   c._count.reportes,
      },
    }),
  };
}

export class ModeracionService {
  // POST /reportes: cualquier usuario con sesión puede reportar un comentario de zona visible
  async crearReporte(usuarioId, { comentario_zona_id, motivo, descripcion }) {
    const comentario = await reputacionRepo.buscarComentarioPorId(comentario_zona_id);
    if (!comentario || comentario.estado !== 'visible')
      throw new AppError('NO_ENCONTRADO', 'Comentario no encontrado', 404);
    if (comentario.usuario.id === usuarioId)
      throw new AppError('COMENTARIO_PROPIO', 'No puedes reportar tu propio comentario', 422);

    try {
      const reporte = await repo.crearReporte({ reportanteId: usuarioId, comentarioZonaId: comentario_zona_id, motivo, descripcion });
      // Al usuario que reporta solo se le confirma; los datos de moderación son para el administrador
      return { id: reporte.id, tipo_objetivo: reporte.tipo_objetivo, motivo: reporte.motivo, estado: reporte.estado, fecha_creacion: reporte.fecha_creacion };
    } catch (err) {
      // Índice único parcial: un reporte abierto por usuario y comentario
      if (err.code === 'P2002')
        throw new AppError('YA_REPORTADO', 'Ya reportaste este comentario; el equipo de moderación lo está revisando', 409);
      throw err;
    }
  }

  // GET /admin/reportes
  async listarReportes(usuario, filtros) {
    this._soloAdmin(usuario);
    const { items, total, abiertos } = await repo.listarReportes(filtros);
    return { data: items.map(formatearReporte), total, abiertos, page: filtros.page, pageSize: filtros.pageSize };
  }

  // PUT /admin/reportes/:id: cambiar el estado y, si se resuelve, opcionalmente ocultar el comentario
  async resolverReporte(usuario, id, { estado, ocultar_comentario }) {
    this._soloAdmin(usuario);
    const reporte = await repo.buscarReporte(id);
    if (!reporte) throw new AppError('NO_ENCONTRADO', 'Reporte no encontrado', 404);

    if (ocultar_comentario && reporte.comentario_zona) {
      await reputacionRepo.cambiarEstadoComentario(reporte.comentario_zona.id, 'oculto');
      await repo.resolverAbiertosDeComentario(reporte.comentario_zona.id);
      return formatearReporte(await repo.buscarReporte(id));
    }
    return formatearReporte(await repo.cambiarEstado(id, estado));
  }

  // Los permisos admin.* no están registrados en la BD (requirePermission dejaría pasar): se exige el rol
  _soloAdmin(usuario) {
    if (!usuario.roles?.some((r) => ROLES_ADMIN.includes(String(r).toLowerCase())))
      throw new AppError('SIN_PERMISO', 'Solo el administrador puede ver y atender los reportes', 403);
  }
}
