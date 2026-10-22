import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, AlertCircle, Map as IconoMapa, SearchX } from 'lucide-react';
import PropiedadCard from '../components/PropiedadCard';
import { useCatalogoPropiedades } from '../hooks/useCatalogoPropiedades';
import { Button, EmptyState, Pagination, Spinner } from '../../../shared/components/ui';
import { BarraBusqueda, FiltrosActivos, ORDENES, PanelFiltros, escribirFiltros, useFiltrosCatalogo } from '../../busqueda';

const PAGE_SIZE = 12;

export default function CatalogoPage() {
  // Búsqueda, filtros y página viven en la URL: se pueden compartir y funciona el botón Atrás
  const { filtros, page, hayFiltros, actualizar, quitar, limpiar, irAPagina } = useFiltrosCatalogo();

  const { data, isPending, isError, error, refetch, isPlaceholderData, isFetching } =
    useCatalogoPropiedades({ page, pageSize: PAGE_SIZE, filtros });

  const propiedades = data?.data ?? [];
  const total       = data?.total ?? 0;
  const totalPages  = Math.ceil(total / PAGE_SIZE);
  // El orden que aplicó el backend (por defecto: relevancia con texto, recientes sin texto)
  const orden       = data?.filtros?.orden ?? filtros.orden ?? (filtros.q ? 'relevancia' : 'recientes');

  // Si la página pedida ya no existe con estos resultados, ir a la última (sin perder los filtros)
  useEffect(() => {
    if (!data || isPlaceholderData) return;
    if (totalPages > 0 && page > totalPages) irAPagina(totalPages, { replace: true });
    if (totalPages === 0 && page > 1) irAPagina(1, { replace: true });
  }, [data, isPlaceholderData, page, totalPages]);

  function cambiarPagina(nueva) {
    irAPagina(nueva);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Propiedades</h1>
          <p className="text-sm text-secondary-500">Explora la oferta disponible en venta y alquiler</p>
        </div>
        {/* La misma búsqueda sobre el mapa: los filtros activos se conservan */}
        <Link
          to={`/mapa${escribirFiltros(filtros).toString() ? `?${escribirFiltros(filtros)}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded bg-secondary-100 px-3 py-1.5 text-sm font-medium text-secondary-800 hover:bg-secondary-200"
        >
          <IconoMapa size={16} aria-hidden="true" /> Ver en el mapa
        </Link>
      </div>

      <div className="mb-6 space-y-4">
        <BarraBusqueda valor={filtros.q ?? ''} onBuscar={(q) => actualizar({ q })} />
        <PanelFiltros filtros={filtros} onCambiar={actualizar} />
        <FiltrosActivos filtros={filtros} onQuitar={quitar} onLimpiar={limpiar} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary-600" aria-live="polite">
          {isPending ? 'Buscando…' : hayFiltros
            ? `${total} ${total === 1 ? 'resultado' : 'resultados'}`
            : `${total} ${total === 1 ? 'propiedad publicada' : 'propiedades publicadas'}`}
          {isFetching && !isPending && <span className="ml-2 text-secondary-400">Actualizando…</span>}
        </p>
        <label className="flex items-center gap-2 text-sm text-secondary-600">
          Ordenar por
          <select
            id="catalogo-orden"
            value={orden}
            onChange={(e) => actualizar({ orden: e.target.value })}
            className="rounded border border-secondary-300 bg-white px-2 py-1.5 text-sm text-secondary-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {ORDENES.filter((o) => !o.requiereTexto || filtros.q).map((o) => (
              <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
            ))}
          </select>
        </label>
      </div>

      {isPending ? (
        <Spinner size="lg" label="Cargando propiedades…" className="py-24" />
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title="No se pudo cargar el catálogo"
          description={error?.message ?? 'Intenta de nuevo en unos momentos.'}
          action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
        />
      ) : propiedades.length === 0 && hayFiltros ? (
        <EmptyState
          icon={SearchX}
          title="No hay propiedades con estos filtros"
          description="Prueba quitar un filtro o buscar con otras palabras."
          action={<Button variant="secondary" onClick={limpiar}>Limpiar filtros</Button>}
        />
      ) : propiedades.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hay propiedades publicadas"
          description="Todavía no hay propiedades disponibles. Vuelve a revisar más tarde."
        />
      ) : (
        <>
          <div
            aria-busy={isPlaceholderData}
            className={[
              'grid grid-cols-1 gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              isPlaceholderData ? 'opacity-60' : '',
            ].join(' ')}
          >
            {propiedades.map((p) => <PropiedadCard key={p.id} propiedad={p} />)}
          </div>

          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} onPageChange={cambiarPagina} />
          </div>
        </>
      )}
    </div>
  );
}
