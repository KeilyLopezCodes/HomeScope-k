import { AppError } from '../../shared/errors/AppError.js';
import { PropiedadesRepository } from './propiedades.repository.js';
import { ComunicacionRepository } from '../comunicacion/comunicacion.repository.js';
import { TRANSICIONES } from './propiedades.schemas.js';

const repo            = new PropiedadesRepository();
const comunicacionRepo = new ComunicacionRepository();

export class PropiedadesService {

  // ── Lectura ────────────────────────────────────────────────────────────────

  async listar(query) {
    return repo.listar(query);
  }

  async getById(propiedadId, solicitanteId = null) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);

    // Solo el dueño puede ver borradores/pausadas propias
    if (propiedad.estado !== 'publicado' && propiedad.vendedor.id !== solicitanteId)
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);

    const { vendedor, ...resto } = propiedad;
    const contactoVisible =
      solicitanteId &&
      solicitanteId !== vendedor.id &&
      (await comunicacionRepo.existeConversacion(propiedadId, solicitanteId));

    return {
      ...resto,
      vendedor: {
        id:       vendedor.id,
        nombre:   vendedor.nombre,
        apellido: vendedor.apellido,
        ...(contactoVisible && { email: vendedor.email, telefono: vendedor.telefono }),
      },
    };
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
    await repo.eliminar(propiedadId);
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

  async _verificarDueno(propiedadId, usuarioId) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad)
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    if (propiedad.vendedor.id !== usuarioId)
      throw new AppError('SIN_PERMISO', 'No tienes permiso para modificar esta propiedad', 403);
    return propiedad;
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
