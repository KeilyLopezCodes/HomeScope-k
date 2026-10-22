// Verificación de identidad del vendedor: el vendedor envía un documento y el administrador lo revisa.
// Solo un vendedor verificado puede publicar (propiedades.service: política de publicación).
// El documento se guarda en el almacenamiento PRIVADO: solo el administrador lo ve, a través de la API
import { AppError } from '../../shared/errors/AppError.js';
import { storage } from '../../shared/adapters/storage/index.js';
import { ModeracionRepository } from './moderacion.repository.js';
import { ComunicacionService } from '../comunicacion/comunicacion.service.js';
import { avisarVerificacion } from './moderacion.avisos.js';

const repo          = new ModeracionRepository();
const comunicacion  = new ComunicacionService();

const ROLES_VENDEDOR = ['vendedor', 'seller'];
const nombreCompleto = (u) => [u?.nombre, u?.apellido].filter(Boolean).join(' ');

// Solicitud → lo que ve el propio vendedor (sin la referencia interna del archivo)
const formatearSolicitud = (v) => v && ({
  id:              v.id,
  estado:          v.estado,
  tipo_documento:  v.tipo_documento,
  fecha_solicitud: v.fecha_solicitud,
  fecha_revision:  v.fecha_revision,
  motivo_rechazo:  v.motivo_rechazo,
});

export class VerificacionService {
  // GET /verificaciones/mia → { verificado, solicitud }: la última solicitud y si alguna fue aprobada
  async miVerificacion(usuarioId) {
    const [verificado, ultima] = await Promise.all([
      repo.vendedorVerificado(usuarioId),
      repo.ultimaVerificacion(usuarioId),
    ]);
    return { verificado, solicitud: formatearSolicitud(ultima) };
  }

  // POST /verificaciones (multipart: documento + tipo_documento)
  async solicitar(usuario, { tipo_documento }, archivo) {
    if (!usuario.roles?.some((r) => ROLES_VENDEDOR.includes(String(r).toLowerCase())))
      throw new AppError('SIN_PERMISO', 'Solo los vendedores verifican su identidad para publicar', 403);
    if (!archivo)
      throw new AppError('SIN_ARCHIVO', 'Adjunta una foto o PDF de tu documento de identidad', 422);
    if (await repo.vendedorVerificado(usuario.id))
      throw new AppError('YA_VERIFICADO', 'Tu identidad ya está verificada', 409);

    const { public_id } = await storage.subirPrivado(archivo, `verificaciones/${usuario.id}`);
    try {
      const solicitud = await repo.crearVerificacion({ usuarioId: usuario.id, tipoDocumento: tipo_documento, documentoRef: public_id });
      // Los administradores reciben una notificación para revisarla
      await avisarVerificacion({ solicitud, vendedorId: usuario.id });
      return formatearSolicitud(solicitud);
    } catch (err) {
      await storage.eliminarPrivado(public_id).catch(() => {});
      // Índice único parcial: una sola solicitud pendiente por vendedor
      if (err.code === 'P2002')
        throw new AppError('SOLICITUD_PENDIENTE', 'Ya enviaste una solicitud; el equipo la está revisando', 409);
      throw err;
    }
  }

  // ── Administrador ──────────────────────────────────────────────────────────

  // GET /admin/verificaciones?estado=pendiente
  async listar(filtros) {
    const { items, total } = await repo.listarVerificaciones(filtros);
    return {
      data: items.map(({ documento_url, usuario, revisor, ...v }) => ({
        ...v,
        usuario: {
          id: usuario.id, nombre: nombreCompleto(usuario), email: usuario.email, estado: usuario.estado,
          fecha_registro: usuario.fecha_registro, propiedades: usuario._count.propiedades,
        },
        revisor: revisor && { id: revisor.id, nombre: nombreCompleto(revisor) },
        // El documento se pide aparte (respuesta binaria, solo administrador)
        documento: `/api/v1/admin/verificaciones/${v.id}/documento`,
      })),
      total, page: filtros.page, pageSize: filtros.pageSize,
    };
  }

  // GET /admin/verificaciones/:id/documento → { buffer, mimetype }
  async documento(id) {
    const v = await repo.buscarVerificacion(id);
    if (!v) throw new AppError('NO_ENCONTRADO', 'Solicitud no encontrada', 404);
    try {
      return await storage.leerPrivado(v.documento_url);
    } catch (err) {
      if (err.code === 'ENOENT') throw new AppError('DOCUMENTO_NO_ENCONTRADO', 'El archivo del documento ya no existe', 404);
      throw err;
    }
  }

  // PUT /admin/verificaciones/:id { estado: aprobada | rechazada, motivo_rechazo }
  async resolver(admin, id, { estado, motivo_rechazo }) {
    const v = await repo.buscarVerificacion(id);
    if (!v) throw new AppError('NO_ENCONTRADO', 'Solicitud no encontrada', 404);
    if (v.usuario_id === admin.id) throw new AppError('OBJETIVO_PROPIO', 'No puedes revisar tu propia solicitud', 422);

    const revisada = await repo.resolverVerificacion(id, { estado, revisadoPor: admin.id, motivo: motivo_rechazo ?? null });
    if (!revisada) throw new AppError('YA_REVISADA', 'Esta solicitud ya fue revisada', 409);

    await this._avisar(v.usuario_id, estado === 'aprobada'
      ? { titulo: 'Tu identidad fue verificada', contenido: 'Ya puedes publicar propiedades. Tu perfil muestra la insignia de vendedor verificado.' }
      : { titulo: 'No pudimos verificar tu identidad', contenido: `Motivo: ${motivo_rechazo}. Puedes enviar una nueva solicitud.` });

    const [resultado] = (await this.listar({ id, page: 1, pageSize: 1 })).data;
    return resultado;
  }

  async _avisar(usuarioId, { titulo, contenido }) {
    try {
      await comunicacion.notificar(usuarioId, { tipo: 'verificacion', titulo, contenido, referencia_tipo: null, referencia_id: null });
    } catch (err) {
      console.error(`No se pudo notificar al usuario ${usuarioId}:`, err.message);
    }
  }
}
