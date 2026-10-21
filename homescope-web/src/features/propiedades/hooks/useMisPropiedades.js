import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listarMisPropiedades, cambiarEstadoPropiedad, renovarPropiedad, eliminarPropiedad,
} from '../services/propiedadesService';

export const MIS_PROPIEDADES_KEY = ['propiedades', 'mias'];

export function useMisPropiedades({ estado, page, pageSize = 10 }) {
  return useQuery({
    queryKey: [...MIS_PROPIEDADES_KEY, estado, page, pageSize],
    queryFn:  () => listarMisPropiedades({ estado, page, pageSize }),
    // Al cambiar de pestaña o de página se sigue mostrando la lista anterior mientras carga
    placeholderData: keepPreviousData,
  });
}

// Acciones sobre una propiedad del vendedor:
//   { accion: 'estado', id, estado } | { accion: 'renovar', id } | { accion: 'eliminar', id }
// Al terminar se invalidan todas las consultas de propiedades: esta lista con sus conteos,
// el catálogo público y la ficha, para que reflejen el cambio sin recargar la página
export function useAccionPropiedad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accion, id, estado }) => {
      if (accion === 'estado')   return cambiarEstadoPropiedad(id, estado);
      if (accion === 'renovar')  return renovarPropiedad(id);
      if (accion === 'eliminar') return eliminarPropiedad(id);
      throw new Error(`Acción desconocida: ${accion}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['propiedades'] }),
  });
}
