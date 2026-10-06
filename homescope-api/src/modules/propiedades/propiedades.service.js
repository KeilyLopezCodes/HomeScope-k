import { AppError } from '../../shared/errors/AppError.js';
import { PropiedadesRepository } from './propiedades.repository.js';
import { ComunicacionRepository } from '../comunicacion/comunicacion.repository.js';

const repo = new PropiedadesRepository();
const comunicacionRepo = new ComunicacionRepository();

export class PropiedadesService {
  async listar(query) {
    return repo.listar(query);
  }

  // Devuelve detalle; aplica regla de contacto (RNF-08):
  // email y telefono del vendedor solo si existe conversación entre solicitante y vendedor
  async getById(propiedadId, solicitanteId = null) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    if (propiedad.estado !== 'publicada' && propiedad.vendedor.id !== solicitanteId)
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);

    const { vendedor, ...resto } = propiedad;
    const contactoVisible =
      solicitanteId &&
      solicitanteId !== vendedor.id &&
      (await comunicacionRepo.existeConversacion(propiedadId, solicitanteId));

    return {
      ...resto,
      vendedor: {
        id: vendedor.id,
        nombre: vendedor.nombre,
        ...(contactoVisible && { email: vendedor.email, telefono: vendedor.telefono }),
      },
    };
  }

  // Historial: propiedades publicadas por el vendedor autenticado
  async listarMias(usuarioId) {
    return repo.listarPorVendedor(usuarioId);
  }

  // Historial: propiedades vistas por el comprador autenticado
  async listarVistas(usuarioId) {
    return repo.listarVistas(usuarioId);
  }

  async registrarVista(propiedadId, usuarioId) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad || propiedad.estado !== 'publicada') return;
    // No registrar vista del propio vendedor
    if (propiedad.vendedor.id === usuarioId) return;
    await repo.registrarVista(usuarioId, propiedadId);
  }

  async crear(datos) {
    return repo.crear(datos);
  }
}
