import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { escribirFiltros, hayFiltrosActivos, leerFiltros } from '../config/filtros';

// Filtros y página del catálogo guardados en la URL (?q=casa&modalidad=venta&page=2):
// se pueden compartir, funcionan con Atrás y la ficha vuelve a la misma búsqueda.
export function useFiltrosCatalogo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtros = useMemo(() => leerFiltros(searchParams), [searchParams]);
  const page = Math.max(1, parseInt(searchParams.get('page')) || 1);

  function navegar(nuevos, { pagina = 1, replace = false } = {}) {
    const params = escribirFiltros(nuevos);
    if (pagina > 1) params.set('page', String(pagina));
    setSearchParams(params, { replace });
  }

  return {
    filtros,
    page,
    hayFiltros: hayFiltrosActivos(filtros),
    // Cualquier cambio de filtro u orden vuelve a la página 1: la página anterior puede no existir
    // en los nuevos resultados y, si existe, mostraría otras propiedades
    actualizar: (parcial) => navegar({ ...filtros, ...parcial }),
    quitar: (...claves) => navegar({ ...filtros, ...Object.fromEntries(claves.map((c) => [c, undefined])) }),
    limpiar: () => navegar({ orden: filtros.orden === 'relevancia' ? undefined : filtros.orden }),
    irAPagina: (pagina, opciones) => navegar(filtros, { ...opciones, pagina }),
  };
}
