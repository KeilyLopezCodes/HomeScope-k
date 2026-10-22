import { apiClient } from '../../../shared/api/client';

export const agregarFavorito = (propiedadId) =>
  apiClient(`/api/v1/favoritos/${propiedadId}`, { method: 'POST' });

export const quitarFavorito = (propiedadId) =>
  apiClient(`/api/v1/favoritos/${propiedadId}`, { method: 'DELETE' });

// Las guardadas por el usuario, con portada, estado (disponible) e índice
export const listarFavoritos = () => apiClient('/api/v1/favoritos');

// Comparador: hasta 4 propiedades publicadas con el índice desglosado → { data, no_disponibles }
export const compararPropiedades = (ids) => apiClient(`/api/v1/propiedades?ids=${ids.join(',')}`);
