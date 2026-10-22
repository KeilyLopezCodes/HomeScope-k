import { AppError } from '../../shared/errors/AppError.js';
import { FavoritosRepository } from './favoritos.repository.js';
import { PropiedadesRepository } from '../propiedades/propiedades.repository.js';
import { GeoIndiceRepository } from '../geo-indice/geo-indice.repository.js';
import { formatearIndice } from '../propiedades/propiedades.service.js';

const repo = new FavoritosRepository();
const propiedadesRepo = new PropiedadesRepository();
const geoIndiceRepo = new GeoIndiceRepository();

export class FavoritosService {
  // Las guardadas con su portada y su índice. Las que ya no están publicadas (pausadas, vendidas…)
  // siguen en la lista con `disponible: false`, para que el usuario decida si las quita
  async listar(usuarioId) {
    const favoritos = await repo.listar(usuarioId);
    const indices = await geoIndiceRepo.indicesVigentes(favoritos.map((f) => f.id));
    return favoritos.map(({ fotos, ...p }) => ({
      ...p,
      portada:             fotos[0]?.url ?? null,
      disponible:          p.estado === 'publicado',
      indice_conveniencia: formatearIndice(indices.get(p.id)),
    }));
  }

  // Solo una propiedad publicada y que no sea propia
  async agregar(usuarioId, propiedadId) {
    const propiedad = await propiedadesRepo.datosModeracion(propiedadId);
    if (!propiedad || propiedad.estado !== 'publicado')
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    if (propiedad.vendedor_id === usuarioId)
      throw new AppError('PROPIEDAD_PROPIA', 'No puedes guardar tu propia publicación en favoritos', 422);
    const existe = await repo.existe(usuarioId, propiedadId);
    if (existe) throw new AppError('YA_GUARDADO', 'La propiedad ya está en favoritos', 409);
    try {
      return await repo.agregar(usuarioId, propiedadId);
    } catch (err) {
      // Dos peticiones a la vez pasan la verificación anterior: el índice único (usuario_id, propiedad_id)
      // rechaza la segunda y se responde igual que si ya estuviera guardada
      if (err.code === 'P2002') throw new AppError('YA_GUARDADO', 'La propiedad ya está en favoritos', 409);
      throw err;
    }
  }

  async eliminar(usuarioId, propiedadId) {
    await repo.eliminar(usuarioId, propiedadId);
  }
}
