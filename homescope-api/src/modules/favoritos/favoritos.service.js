import { AppError } from '../../shared/errors/AppError.js';
import { FavoritosRepository } from './favoritos.repository.js';

const repo = new FavoritosRepository();

export class FavoritosService {
  async listar(usuarioId) {
    return repo.listar(usuarioId);
  }

  async agregar(usuarioId, propiedadId) {
    const existe = await repo.existe(usuarioId, propiedadId);
    if (existe) throw new AppError('YA_GUARDADO', 'La propiedad ya está en favoritos', 409);
    return repo.agregar(usuarioId, propiedadId);
  }

  async eliminar(usuarioId, propiedadId) {
    await repo.eliminar(usuarioId, propiedadId);
  }
}
