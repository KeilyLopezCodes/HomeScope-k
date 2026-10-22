import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { enviarVerificacion, obtenerMiVerificacion } from '../services/verificacionService';

const ROLES_VENDEDOR = ['vendedor', 'seller'];

// Estado de la verificación del vendedor con sesión (no se consulta para otros roles)
export function useMiVerificacion() {
  const { user, sesionVerificada } = useAuth();
  const esVendedor = ROLES_VENDEDOR.includes(user?.rol?.toLowerCase());
  return useQuery({
    queryKey: ['verificacion', 'mia', user?.id ?? null],
    queryFn:  obtenerMiVerificacion,
    enabled:  esVendedor && sesionVerificada,
  });
}

export function useEnviarVerificacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enviarVerificacion,
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['verificacion'] }),
  });
}
