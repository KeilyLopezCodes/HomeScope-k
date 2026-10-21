// Moderación: reportes de los usuarios y acciones del administrador sobre publicaciones y cuentas.
// Toda acción queda en accion_moderacion, en la misma transacción que el cambio que registra
import { AppError } from '../../shared/errors/AppError.js';
import { storage } from '../../shared/adapters/storage/index.js';
import { realtime } from '../../shared/adapters/realtime.adapter.js';
import { olvidarEstadoCuenta } from '../../shared/middleware/auth.js';
import { ModeracionRepository } from './moderacion.repository.js';
import { ReputacionRepository } from '../reputacion/reputacion.repository.js';
import { PropiedadesRepository } from '../propiedades/propiedades.repository.js';
import { IdentidadRepository } from '../identidad/identidad.repository.js';
import { ComunicacionService } from '../comunicacion/comunicacion.service.js';

const repo           = new ModeracionRepository();
const reputacionRepo = new ReputacionRepository();
const propiedadesRepo = new PropiedadesRepository();
const identidadRepo  = new IdentidadRepository();
const comunicacion   = new ComunicacionService();

export const ROLES_ADMIN = ['administrador', 'admin'];
const esAdmin = (roles = []) => roles.some((r) => ROLES_ADMIN.includes(String(r).toLowerCase()));
const nombreCompleto = (u) => [u?.nombre, u?.apellido].filter(Boolean).join(' ');
const contarAbiertos = (c) => c?._count?.reportes ?? c?._count?.reportes_recibidos ?? 0;

// Reporte → forma de la cola del administrador
function formatearReporte(r) {
  const { comentario_zona: c, propiedad: p, usuario_reportado: u } = r;
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
        id: c.id, texto: c.comentario, estado: c.estado, fecha_creacion: c.fecha_creacion,
        autor: c.usuario, propiedad: c.propiedad, reportes_abiertos: contarAbiertos(c),
      },
    }),
    ...(p && { propiedad: { id: p.id, titulo: p.titulo, estado: p.estado, vendedor_id: p.vendedor_id, reportes_abiertos: contarAbiertos(p) } }),
    ...(u && { usuario: { id: u.id, nombre: nombreCompleto(u), estado: u.estado, reportes_abiertos: contarAbiertos(u) } }),
  };
}

const formatearAccion = (a) => ({
  id:            a.id,
  accion:        a.accion,
  motivo:        a.motivo,
  fecha_accion:  a.fecha_accion,
  administrador: { id: a.administrador.id, nombre: nombreCompleto(a.administrador) },
  reporte_id:    a.reporte_id,
  // Si el objetivo ya no existe (publicación eliminada), queda la copia guardada en `detalle`
  propiedad:     a.propiedad ?? (a.detalle?.propiedad ? { ...a.detalle.propiedad, eliminada: true } : null),
  usuario:       a.usuario ? { id: a.usuario.id, nombre: nombreCompleto(a.usuario), estado: a.usuario.estado } : null,
  detalle:       a.detalle,
});

const resumenReportes = (reportes) => ({
  reportes_abiertos: reportes.length,
  motivos:           Object.entries(reportes.reduce((m, r) => ({ ...m, [r.motivo]: (m[r.motivo] ?? 0) + 1 }), {}))
    .map(([motivo, cantidad]) => ({ motivo, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
  ultimo_reporte:    reportes[0]?.fecha_creacion ?? null,
  reportes,
});

export class ModeracionService {
  // ── Reportes (cualquier usuario con sesión) ────────────────────────────────

  // POST /reportes: un comentario de zona visible, una publicación publicada o un usuario
  async crearReporte(usuarioId, { tipo_objetivo, comentario_zona_id, propiedad_id, usuario_reportado_id, motivo, descripcion }) {
    let objetivoId;
    if (tipo_objetivo === 'comentario') {
      const comentario = await reputacionRepo.buscarComentarioPorId(comentario_zona_id);
      if (!comentario || comentario.estado !== 'visible') throw new AppError('NO_ENCONTRADO', 'Comentario no encontrado', 404);
      if (comentario.usuario.id === usuarioId) throw new AppError('OBJETIVO_PROPIO', 'No puedes reportar tu propio comentario', 422);
      objetivoId = comentario_zona_id;
    } else if (tipo_objetivo === 'propiedad') {
      const propiedad = await propiedadesRepo.datosModeracion(propiedad_id);
      if (!propiedad || propiedad.estado !== 'publicado') throw new AppError('NO_ENCONTRADO', 'Publicación no encontrada', 404);
      if (propiedad.vendedor_id === usuarioId) throw new AppError('OBJETIVO_PROPIO', 'No puedes reportar tu propia publicación', 422);
      objetivoId = propiedad_id;
    } else {
      const usuario = await identidadRepo.datosModeracion(usuario_reportado_id);
      if (!usuario || usuario.estado === 'inhabilitado') throw new AppError('NO_ENCONTRADO', 'Usuario no encontrado', 404);
      if (usuario.id === usuarioId) throw new AppError('OBJETIVO_PROPIO', 'No puedes reportarte a ti mismo', 422);
      objetivoId = usuario_reportado_id;
    }

    try {
      const reporte = await repo.crearReporte({ reportanteId: usuarioId, tipo: tipo_objetivo, objetivoId, motivo, descripcion });
      // Al usuario que reporta solo se le confirma; los datos de moderación son para el administrador
      return { id: reporte.id, tipo_objetivo: reporte.tipo_objetivo, motivo: reporte.motivo, estado: reporte.estado, fecha_creacion: reporte.fecha_creacion };
    } catch (err) {
      // Índices únicos parciales: un reporte abierto por usuario y objetivo
      if (err.code === 'P2002')
        throw new AppError('YA_REPORTADO', 'Ya lo reportaste; el equipo de moderación lo está revisando', 409);
      throw err;
    }
  }

  // ── Administración (las rutas /admin ya exigen el rol administrador) ───────

  // GET /admin/reportes
  async listarReportes(filtros) {
    const { items, total, abiertos } = await repo.listarReportes(filtros);
    return { data: items.map(formatearReporte), total, abiertos, page: filtros.page, pageSize: filtros.pageSize };
  }

  // PUT /admin/reportes/:id: cambiar el estado y, si se resuelve, opcionalmente ocultar el comentario.
  // Resolver o descartar queda registrado como acción de moderación
  async resolverReporte(admin, id, { estado, ocultar_comentario, motivo }) {
    const reporte = await repo.buscarReporte(id);
    if (!reporte) throw new AppError('NO_ENCONTRADO', 'Reporte no encontrado', 404);
    const comentario = reporte.comentario_zona;

    await repo.enTransaccion(async (tx) => {
      if (ocultar_comentario && comentario) {
        await reputacionRepo.cambiarEstadoComentario(comentario.id, 'oculto', tx);
        await repo.cerrarAbiertos({ comentarioZonaId: comentario.id }, 'resuelto', tx);
      } else {
        await repo.cambiarEstado(id, estado, tx);
      }
      if (estado === 'en_revision') return;
      await repo.registrarAccion({
        administradorId: admin.id,
        accion:          ocultar_comentario && comentario ? 'ocultar_comentario' : 'descartar_reporte',
        motivo:          motivo ?? (ocultar_comentario ? 'Comentario ocultado por moderación' : `Reporte marcado como ${estado}`),
        reporteId:       id,
        propiedadId:     reporte.propiedad?.id ?? comentario?.propiedad?.id ?? null,
        usuarioId:       reporte.usuario_reportado?.id ?? comentario?.usuario?.id ?? null,
        detalle:         { estado_reporte: estado, ...(comentario && { comentario_id: comentario.id }) },
      }, tx);
    });
    return formatearReporte(await repo.buscarReporte(id));
  }

  // GET /admin/propiedades?reportadas=true
  async listarPropiedades(filtros) {
    const { items, total } = await propiedadesRepo.listarParaModeracion(filtros);
    return {
      data: items.map(({ fotos, reportes, vendedor, ...p }) => ({
        ...p,
        portada:  fotos[0]?.url ?? null,
        vendedor: { id: vendedor.id, nombre: nombreCompleto(vendedor), estado: vendedor.estado },
        ...resumenReportes(reportes),
      })),
      total, page: filtros.page, pageSize: filtros.pageSize,
    };
  }

  // GET /admin/usuarios?reportados=true
  async listarUsuarios(filtros) {
    const { items, total } = await identidadRepo.listarParaModeracion(filtros);
    return {
      data: items.map(({ usuario_rol, _count, reportes_recibidos, ...u }) => ({
        ...u,
        roles: usuario_rol.map((ur) => ur.rol.nombre),
        propiedades_publicadas: _count.propiedades,
        ...resumenReportes(reportes_recibidos),
      })),
      total, page: filtros.page, pageSize: filtros.pageSize,
    };
  }

  // GET /admin/acciones
  async listarAcciones(filtros) {
    const { items, total } = await repo.listarAcciones(filtros);
    return { data: items.map(formatearAccion), total, page: filtros.page, pageSize: filtros.pageSize };
  }

  // POST /admin/acciones: ejecuta la acción y la registra
  async ejecutarAccion(admin, datos) {
    if (datos.reporte_id) await this._verificarReporte(datos);
    const accion = datos.propiedad_id
      ? await this._accionPropiedad(admin, datos)
      : await this._accionUsuario(admin, datos);
    return formatearAccion(accion);
  }

  // ── Acciones sobre publicaciones ───────────────────────────────────────────

  async _accionPropiedad(admin, { accion, propiedad_id: id, motivo, reporte_id }) {
    const propiedad = await propiedadesRepo.datosModeracion(id);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Publicación no encontrada', 404);
    const base = { administradorId: admin.id, accion, motivo, reporteId: reporte_id ?? null, propiedadId: id, usuarioId: propiedad.vendedor_id };

    if (accion === 'pausar') {
      if (propiedad.estado !== 'publicado')
        throw new AppError('ESTADO_INVALIDO', `Solo se pausan publicaciones publicadas (esta está ${propiedad.estado})`, 422);
      const registro = await repo.enTransaccion(async (tx) => {
        await propiedadesRepo.cambiarEstado(id, 'pausado', {}, tx);
        const cerrados = await repo.cerrarAbiertos({ propiedadId: id }, 'resuelto', tx);
        return repo.registrarAccion({ ...base, detalle: { estado_anterior: 'publicado', reportes_cerrados: cerrados } }, tx);
      });
      await this._avisar(propiedad.vendedor_id, 'Pausamos una de tus publicaciones',
        `"${propiedad.titulo}" fue pausada por moderación: ${motivo}. No podrás reactivarla hasta que el equipo la revise de nuevo.`, id);
      return registro;
    }

    if (accion === 'aprobar') {
      // Aprobar descarta los reportes abiertos y, si la había pausado moderación, la vuelve a publicar
      const abiertos = await repo.contarAbiertos({ propiedadId: id });
      const pausadaPorModeracion = propiedad.estado === 'pausado' && await this.pausadaPorModeracion(id);
      if (!abiertos && !pausadaPorModeracion)
        throw new AppError('NADA_QUE_APROBAR', 'La publicación no tiene reportes abiertos ni está pausada por moderación', 422);
      const registro = await repo.enTransaccion(async (tx) => {
        // Vuelve con su fecha de publicación original (la pausa no le quita antigüedad en el catálogo)
        if (pausadaPorModeracion) await propiedadesRepo.cambiarEstadoVarias([id], 'pausado', 'publicado', tx);
        const cerrados = await repo.cerrarAbiertos({ propiedadId: id }, 'descartado', tx);
        return repo.registrarAccion({ ...base, detalle: { reportes_descartados: cerrados, republicada: pausadaPorModeracion } }, tx);
      });
      if (pausadaPorModeracion)
        await this._avisar(propiedad.vendedor_id, 'Tu publicación volvió a estar visible',
          `El equipo de moderación revisó "${propiedad.titulo}" y la publicó de nuevo.`, id);
      return registro;
    }

    // eliminar: se borra con sus fotos; el registro guarda una copia porque propiedad_id quedará en NULL
    const fotos = await propiedadesRepo.listarFotos(id);
    const abiertos = await repo.contarAbiertos({ propiedadId: id });
    const registro = await repo.enTransaccion(async (tx) => {
      const r = await repo.registrarAccion({
        ...base,
        detalle: {
          propiedad: { id, titulo: propiedad.titulo, estado: propiedad.estado, vendedor_id: propiedad.vendedor_id },
          reportes_abiertos: abiertos,
        },
      }, tx);
      await propiedadesRepo.eliminar(id, tx); // sus reportes se borran en cascada
      return r;
    });
    await Promise.allSettled(fotos.map((f) => storage.eliminar(f.public_id)));
    await this._avisar(propiedad.vendedor_id, 'Eliminamos una de tus publicaciones',
      `"${propiedad.titulo}" fue eliminada por moderación: ${motivo}.`, null);
    // La respuesta se arma con lo registrado (la propiedad ya no existe)
    return { ...registro, propiedad: null };
  }

  // ── Acciones sobre cuentas ─────────────────────────────────────────────────

  async _accionUsuario(admin, { accion, usuario_id: id, motivo, reporte_id }) {
    const usuario = await identidadRepo.datosModeracion(id);
    if (!usuario) throw new AppError('NO_ENCONTRADO', 'Usuario no encontrado', 404);
    const base = { administradorId: admin.id, accion, motivo, reporteId: reporte_id ?? null, usuarioId: id };

    if (accion === 'suspender') {
      if (id === admin.id) throw new AppError('OBJETIVO_PROPIO', 'No puedes suspender tu propia cuenta', 422);
      if (esAdmin(usuario.usuario_rol.map((ur) => ur.rol.nombre)))
        throw new AppError('SIN_PERMISO', 'No se puede suspender a otro administrador', 403);
      if (usuario.estado === 'suspendido') throw new AppError('ESTADO_INVALIDO', 'La cuenta ya está suspendida', 422);

      // Sus publicaciones dejan de verse mientras dure la suspensión; se guardan para restaurarlas al reactivar
      const publicadas = await propiedadesRepo.idsPublicadasDe(id);
      const registro = await repo.enTransaccion(async (tx) => {
        await identidadRepo.cambiarEstadoCuenta(id, 'suspendido', tx);
        await identidadRepo.revocarTokensDeUsuario(id, 'refresh', tx);
        const pausadas = await propiedadesRepo.cambiarEstadoVarias(publicadas, 'publicado', 'pausado', tx);
        const cerrados = await repo.cerrarAbiertos({ usuarioId: id }, 'resuelto', tx);
        return repo.registrarAccion({
          ...base, detalle: { estado_anterior: usuario.estado, propiedades_pausadas: pausadas, reportes_cerrados: cerrados },
        }, tx);
      });
      // Pierde el acceso ya, aunque tenga un access token vigente (arquitectura §12, Seguridad)
      olvidarEstadoCuenta(id);
      await realtime.desconectarUsuario?.(id);
      return registro;
    }

    if (accion === 'reactivar') {
      if (usuario.estado !== 'suspendido') throw new AppError('ESTADO_INVALIDO', 'La cuenta no está suspendida', 422);
      const suspension = await repo.ultimaAccion({ usuarioId: id }, ['suspender']);
      const estadoAnterior = suspension?.detalle?.estado_anterior;
      const restaurar = suspension?.detalle?.propiedades_pausadas ?? [];
      const registro = await repo.enTransaccion(async (tx) => {
        await identidadRepo.cambiarEstadoCuenta(id, estadoAnterior && estadoAnterior !== 'suspendido' ? estadoAnterior : 'activo', tx);
        // Solo vuelven las que la suspensión pausó y siguen pausadas
        const republicadas = await propiedadesRepo.cambiarEstadoVarias(restaurar, 'pausado', 'publicado', tx);
        return repo.registrarAccion({ ...base, detalle: { propiedades_republicadas: republicadas } }, tx);
      });
      olvidarEstadoCuenta(id);
      await this._avisar(id, 'Tu cuenta fue reactivada', `El equipo de moderación reactivó tu cuenta. ${motivo}`, null);
      return registro;
    }

    // aprobar: los reportes contra el usuario no proceden
    const abiertos = await repo.contarAbiertos({ usuarioId: id });
    if (!abiertos) throw new AppError('NADA_QUE_APROBAR', 'El usuario no tiene reportes abiertos', 422);
    return repo.enTransaccion(async (tx) => {
      const cerrados = await repo.cerrarAbiertos({ usuarioId: id }, 'descartado', tx);
      return repo.registrarAccion({ ...base, detalle: { reportes_descartados: cerrados } }, tx);
    });
  }

  // ¿La última decisión de moderación sobre la publicación fue pausarla? (el dueño no puede reactivarla)
  async pausadaPorModeracion(propiedadId) {
    const ultima = await repo.ultimaAccion({ propiedadId }, ['pausar', 'aprobar']);
    return ultima?.accion === 'pausar';
  }

  // El reporte indicado debe existir y ser sobre el mismo objetivo de la acción
  async _verificarReporte({ reporte_id, propiedad_id, usuario_id }) {
    const reporte = await repo.buscarReporte(reporte_id);
    if (!reporte) throw new AppError('NO_ENCONTRADO', 'Reporte no encontrado', 404);
    const coincide = propiedad_id
      ? reporte.propiedad?.id === propiedad_id
      : reporte.usuario_reportado?.id === usuario_id;
    if (!coincide) throw new AppError('REPORTE_NO_CORRESPONDE', 'El reporte no es sobre ese objetivo', 422);
  }

  // Notificación al afectado; si falla, la acción ya quedó hecha y registrada
  async _avisar(usuarioId, titulo, contenido, propiedadId) {
    try {
      await comunicacion.notificar(usuarioId, {
        tipo: 'sistema', titulo, contenido,
        referencia_tipo: propiedadId ? 'propiedad' : null, referencia_id: propiedadId,
      });
    } catch (err) {
      console.error(`No se pudo notificar al usuario ${usuarioId}:`, err.message);
    }
  }
}
