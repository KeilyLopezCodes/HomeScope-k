import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth';
import { agregarFavorito, listarFavoritos, quitarFavorito } from '../services/favoritosService';

export const FAVORITOS_KEY = ['favoritos'];

// Favoritos del usuario con sesión (sin sesión: lista vacía, sin consultar)
export function useFavoritos() {
  const { user, sesionVerificada } = useAuth();
  const consulta = useQuery({
    queryKey: [...FAVORITOS_KEY, user?.id ?? null],
    queryFn:  listarFavoritos,
    enabled:  Boolean(user) && sesionVerificada,
  });
  const ids = useMemo(() => new Set((consulta.data ?? []).map((f) => f.id)), [consulta.data]);
  return { ...consulta, ids };
}

// Guardar o quitar ({ propiedadId, guardar }). La lista de favoritos se actualiza al instante y se
// revierte si el backend falla; al terminar se vuelven a pedir los favoritos y la ficha (es_favorito)
export function useAlternarFavorito() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propiedadId, guardar }) => {
      try {
        await (guardar ? agregarFavorito(propiedadId) : quitarFavorito(propiedadId));
      } catch (err) {
        if (err.status !== 409) throw err; // 409: ya estaba guardada, el resultado es el mismo
      }
    },
    onMutate: async ({ propiedadId, guardar, propiedad }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITOS_KEY });
      const anteriores = queryClient.getQueriesData({ queryKey: FAVORITOS_KEY });
      queryClient.setQueriesData({ queryKey: FAVORITOS_KEY }, (lista) => {
        if (!lista) return lista;
        if (!guardar) return lista.filter((f) => f.id !== propiedadId);
        return propiedad && !lista.some((f) => f.id === propiedadId)
          ? [{ ...propiedad, disponible: true, guardado_en: new Date().toISOString() }, ...lista]
          : lista;
      });
      return { anteriores };
    },
    onError: (_err, _vars, ctx) => ctx?.anteriores.forEach(([key, datos]) => queryClient.setQueryData(key, datos)),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITOS_KEY });
      queryClient.invalidateQueries({ queryKey: ['propiedades', 'detalle'] });
    },
  });
}
