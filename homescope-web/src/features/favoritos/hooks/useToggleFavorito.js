import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agregarFavorito, quitarFavorito } from '../services/favoritosService';

// queryKey: la consulta que guarda `es_favorito` (p. ej. la ficha), para actualizarla al instante
export function useToggleFavorito(propiedadId, queryKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guardar) => {
      try {
        await (guardar ? agregarFavorito(propiedadId) : quitarFavorito(propiedadId));
      } catch (err) {
        if (err.status !== 409) throw err; // 409: ya estaba guardada, el resultado es el mismo
      }
    },
    onMutate: async (guardar) => {
      await queryClient.cancelQueries({ queryKey });
      const anterior = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (d) => d && { ...d, es_favorito: guardar });
      return { anterior };
    },
    onError: (_err, _guardar, ctx) => queryClient.setQueryData(queryKey, ctx?.anterior),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favoritos'] }),
  });
}
