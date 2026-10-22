import { useQuery } from '@tanstack/react-query';
import { obtenerDestacadas } from '../services/propiedadesService';

// Igual que la caché del endpoint (5 minutos): al volver al catálogo no se pide de nuevo
export function useDestacadas() {
  return useQuery({
    queryKey: ['propiedades', 'destacadas'],
    queryFn:  obtenerDestacadas,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
