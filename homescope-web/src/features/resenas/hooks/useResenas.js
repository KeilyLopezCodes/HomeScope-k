import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { consultarElegibilidad, crearResena, listarResenasVendedor, obtenerPerfilVendedor } from '../services/resenasService';

export const CLAVES_RESENAS = {
  vendedor:     (id) => ['vendedores', String(id)],
  resenas:      (id) => ['vendedores', String(id), 'resenas'],
  elegibilidad: (propiedadId) => ['resenas', 'elegibilidad', String(propiedadId)],
};

const sinReintentar404 = (intentos, error) => ![400, 404].includes(error?.status) && intentos < 2;

export function usePerfilVendedor(vendedorId) {
  return useQuery({
    queryKey: CLAVES_RESENAS.vendedor(vendedorId),
    queryFn:  () => obtenerPerfilVendedor(vendedorId),
    enabled:  Boolean(vendedorId),
    retry:    sinReintentar404,
  });
}

// Reseñas de 5 en 5; "Ver más" pide la página siguiente
export function useResenasVendedor(vendedorId, { pageSize = 5 } = {}) {
  return useInfiniteQuery({
    queryKey: [...CLAVES_RESENAS.resenas(vendedorId), pageSize],
    queryFn:  ({ pageParam }) => listarResenasVendedor(vendedorId, { page: pageParam, pageSize }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.page * ultima.pageSize < ultima.total ? ultima.page + 1 : undefined),
    enabled: Boolean(vendedorId),
    retry:   sinReintentar404,
  });
}

// Solo con sesión: si no, no hay a quién preguntarle si puede calificar
export function useElegibilidad(propiedadId, { enabled = true } = {}) {
  return useQuery({
    queryKey: CLAVES_RESENAS.elegibilidad(propiedadId),
    queryFn:  () => consultarElegibilidad(propiedadId),
    enabled:  enabled && Boolean(propiedadId),
  });
}

export function useCrearResena(vendedorId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crearResena,
    onSuccess: (_resena, { propiedadId }) => {
      // Cambian el promedio del vendedor, su lista de reseñas, la ficha (que muestra el promedio) y la elegibilidad
      queryClient.invalidateQueries({ queryKey: CLAVES_RESENAS.vendedor(vendedorId) });
      queryClient.invalidateQueries({ queryKey: CLAVES_RESENAS.elegibilidad(propiedadId) });
      queryClient.invalidateQueries({ queryKey: ['propiedades', 'detalle'] });
    },
  });
}
