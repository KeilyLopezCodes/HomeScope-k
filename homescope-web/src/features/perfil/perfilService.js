import { apiClient } from '../../shared/api/client';

export const getPerfil = () => apiClient('/api/v1/auth/perfil');

export const updatePerfil = (datos) =>
  apiClient('/api/v1/auth/perfil', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

// Stubs — se reemplazarán cuando los módulos estén implementados
export const getPropiedadesPublicadas = () =>
  apiClient('/api/v1/propiedades?mias=true').catch(() => []);

export const getPropiedadesGuardadas = () =>
  apiClient('/api/v1/favoritos').catch(() => []);

export const getPropiedadesVistas = () =>
  apiClient('/api/v1/propiedades/vistas').catch(() => []);
