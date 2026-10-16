import { apiClient } from '../../../shared/api/client';

export const agregarFavorito = (propiedadId) =>
  apiClient(`/api/v1/favoritos/${propiedadId}`, { method: 'POST' });

export const quitarFavorito = (propiedadId) =>
  apiClient(`/api/v1/favoritos/${propiedadId}`, { method: 'DELETE' });
