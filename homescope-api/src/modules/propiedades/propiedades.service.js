import { AppError } from '../../shared/errors/AppError.js';
import { PropiedadesRepository } from './propiedades.repository.js';
import { ComunicacionRepository } from '../comunicacion/comunicacion.repository.js';
import { FavoritosRepository } from '../favoritos/favoritos.repository.js';
import { TRANSICIONES, FOTOS_CONFIG } from './propiedades.schemas.js';
import { storage } from '../../shared/adapters/storage/index.js';

const repo            = new PropiedadesRepository();
const comunicacionRepo = new ComunicacionRepository();
const favoritosRepo    = new FavoritosRepository();

const ROLES_ADMIN = ['administrador', 'admin'];

export class PropiedadesService {

  // ── Lectura ────────────────────────────────────────────────────────────────

  async listar({ page, pageSize }) {
    const { items, total } = await repo.listar({ page, pageSize });
    return {
      // TODO: tomar el índice vigente cuando geo-indice lo calcule; mientras tanto el semáforo queda "sin calcular"
      data: items.map((p) => ({ ...p, indice_conveniencia: null })),
      total,
      page,
      pageSize,
    };
  }

  // solicitante: { id, roles } del token (o null si es un visitante)
  async getById(propiedadId, solicitante = null) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);

    const solicitanteId = solicitante?.id ?? null;
    const esDueno = solicitanteId === propiedad.vendedor.id;
    this._verificarVisible(propiedad.estado, propiedad.vendedor.id, solicitante);

    const { vendedor, ...resto } = propiedad;
    const contactoVisible =
      solicitanteId &&
      !esDueno &&
      (await comunicacionRepo.existeConversacion(propiedadId, solicitanteId));
    const esFavorito = solicitanteId && !esDueno
      ? Boolean(await favoritosRepo.existe(solicitanteId, propiedadId))
      : false;

    return {
      ...resto,
      vendedor: {
        id:       vendedor.id,
        nombre:   vendedor.nombre,
        apellido: vendedor.apellido,
        foto_url: vendedor.foto_url,
        // TODO: tomar de verificacion_vendedor y de las reseñas cuando existan esos módulos
        verificado:            false,
        calificacion_promedio: null,
        total_resenas:         0,
        ...(contactoVisible && { email: vendedor.email, telefono: vendedor.telefono }),
      },
      // TODO: índice vigente precalculado de geo-indice (ADR-08); null = "índice en cálculo".
      // Los puntos de interés se piden aparte: GET /geo/propiedades/:id/puntos-interes
      indice_conveniencia: null,
      es_dueno:            esDueno,
      es_favorito:         esFavorito,
    };
  }

  // Coordenadas de una propiedad visible para el solicitante (lo usa geo-indice para los puntos de interés)
  async obtenerUbicacion(propiedadId, solicitante = null) {
    const propiedad = await repo.buscarUbicacion(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    this._verificarVisible(propiedad.estado, propiedad.vendedor_id, solicitante);

    if (propiedad.latitud == null || propiedad.longitud == null)
      throw new AppError('SIN_UBICACION', 'La propiedad no tiene coordenadas registradas', 422);
    return { lat: Number(propiedad.latitud), lng: Number(propiedad.longitud) };
  }

  async listarMias(usuarioId) {
    return repo.listarPorVendedor(usuarioId);
  }

  async listarVistas(usuarioId) {
    return repo.listarVistas(usuarioId);
  }

  async registrarVista(propiedadId, usuarioId, origen = 'catalogo') {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad || propiedad.estado !== 'publicado') return;
    if (propiedad.vendedor.id === usuarioId) return;
    await repo.registrarVista(usuarioId, propiedadId, origen);
  }

  // ── Escritura ──────────────────────────────────────────────────────────────

  async crear(datos, vendedorId) {
    const { paso_formulario = 1, ...campos } = datos;
    return repo.crear({
      ...campos,
      vendedor_id:     vendedorId,
      estado:          'borrador',   // siempre inicia como borrador
      paso_formulario,
    });
  }

  async actualizar(propiedadId, datos, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);

    // No se puede editar una propiedad vendida o alquilada
    if (['vendido', 'alquilado'].includes(propiedad.estado))
      throw new AppError('ESTADO_INVALIDO', 'No se puede editar una propiedad vendida o alquilada', 422);

    // Si cambia el precio, registrar en historial
    if (datos.precio !== undefined && Number(datos.precio) !== Number(propiedad.precio)) {
      await repo.registrarHistorialPrecio(
        propiedadId,
        propiedad.precio,
        datos.precio,
        usuarioId
      );
    }

    return repo.actualizar(propiedadId, datos);
  }

  async eliminar(propiedadId, usuarioId) {
    await this._verificarDueno(propiedadId, usuarioId);
    const fotos = await repo.listarFotos(propiedadId);
    await repo.eliminar(propiedadId); // las filas de fotos se borran en cascada
    await this._borrarArchivos(fotos.map((f) => f.public_id));
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────

  // archivos: req.files de multer (ya validados en tipo y tamaño), en el orden enviado
  async agregarFotos(propiedadId, archivos, indicePortada, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);

    if (!archivos?.length)
      throw new AppError('SIN_ARCHIVOS', 'Debes enviar al menos una imagen', 422);
    if (indicePortada !== undefined && indicePortada >= archivos.length)
      throw new AppError('VALIDACION', 'El índice de portada no corresponde a ninguna imagen enviada', 422);

    const actuales = await repo.listarFotos(propiedadId);
    const { maxPorPropiedad } = FOTOS_CONFIG;
    if (actuales.length + archivos.length > maxPorPropiedad)
      throw new AppError(
        'LIMITE_FOTOS',
        `Una propiedad admite máximo ${maxPorPropiedad} fotos (ya tiene ${actuales.length})`,
        422
      );

    // Subir a la estrategia de storage; si algo falla, revertir lo ya subido
    const subidas = [];
    try {
      for (const archivo of archivos) {
        const { url, public_id } = await storage.subir(archivo, `propiedades/${propiedadId}`);
        subidas.push({ url, public_id, tamano_bytes: archivo.size });
      }
      await repo.agregarFotos(propiedadId, subidas, indicePortada ?? null);
    } catch (err) {
      await this._borrarArchivos(subidas.map((s) => s.public_id));
      throw err;
    }

    return repo.listarFotos(propiedadId);
  }

  async eliminarFoto(propiedadId, fotoId, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);
    await this._verificarFoto(propiedadId, fotoId);
    const foto = await repo.eliminarFoto(propiedadId, fotoId);
    await this._borrarArchivos([foto.public_id]);
    return repo.listarFotos(propiedadId);
  }

  async reordenarFotos(propiedadId, orden, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);
    const actuales = await repo.listarFotos(propiedadId);
    const idsActuales = new Set(actuales.map((f) => f.id));
    const idsNuevos   = new Set(orden);

    const mismoConjunto =
      orden.length === idsActuales.size &&
      idsNuevos.size === orden.length &&
      orden.every((id) => idsActuales.has(id));
    if (!mismoConjunto)
      throw new AppError('ORDEN_INVALIDO', 'El orden debe incluir exactamente todas las fotos de la propiedad, sin repetir', 422);

    await repo.reordenarFotos(orden);
    return repo.listarFotos(propiedadId);
  }

  async definirPortada(propiedadId, fotoId, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);
    await this._verificarFoto(propiedadId, fotoId);
    await repo.definirPortada(propiedadId, fotoId);
    return repo.listarFotos(propiedadId);
  }

  // POST /propiedades/:id/publicar  → borrador|pausado → publicado
  async publicar(propiedadId, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);
    this._validarTransicion(propiedad.estado, 'publicado');
    return repo.cambiarEstado(propiedadId, 'publicado');
  }

  // PATCH /propiedades/:id/estado  → cualquier transición válida
  async cambiarEstado(propiedadId, nuevoEstado, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);
    this._validarTransicion(propiedad.estado, nuevoEstado);
    return repo.cambiarEstado(propiedadId, nuevoEstado);
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  // Las no publicadas solo las ven su dueño y el administrador; para los demás no existen
  _verificarVisible(estado, vendedorId, solicitante) {
    if (estado === 'publicado') return;
    const esDueno = solicitante?.id != null && solicitante.id === vendedorId;
    const esAdmin = solicitante?.roles?.some((r) => ROLES_ADMIN.includes(r)) ?? false;
    if (!esDueno && !esAdmin) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
  }

  async _verificarDueno(propiedadId, usuarioId) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad)
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    if (propiedad.vendedor.id !== usuarioId)
      throw new AppError('SIN_PERMISO', 'No tienes permiso para modificar esta propiedad', 403);
    return propiedad;
  }

  async _verificarEditable(propiedadId, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);
    if (['vendido', 'alquilado'].includes(propiedad.estado))
      throw new AppError('ESTADO_INVALIDO', 'No se puede editar una propiedad vendida o alquilada', 422);
    return propiedad;
  }

  async _verificarFoto(propiedadId, fotoId) {
    const foto = await repo.buscarFoto(propiedadId, fotoId);
    if (!foto) throw new AppError('NO_ENCONTRADO', 'Foto no encontrada', 404);
    return foto;
  }

  // Borra archivos del storage sin interrumpir la operación si alguno falla
  async _borrarArchivos(publicIds) {
    const resultados = await Promise.allSettled(publicIds.map((id) => storage.eliminar(id)));
    resultados
      .filter((r) => r.status === 'rejected')
      .forEach((r) => console.error('No se pudo eliminar archivo del storage:', r.reason?.message));
  }

  _validarTransicion(estadoActual, estadoDestino) {
    const permitidos = TRANSICIONES[estadoActual] ?? [];
    if (!permitidos.includes(estadoDestino))
      throw new AppError(
        'TRANSICION_INVALIDA',
        `No se puede pasar de "${estadoActual}" a "${estadoDestino}". Estados permitidos: ${permitidos.join(', ') || 'ninguno'}`,
        422
      );
  }
}
