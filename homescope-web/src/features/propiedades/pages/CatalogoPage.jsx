import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, AlertCircle } from 'lucide-react';
import PropiedadCard from '../components/PropiedadCard';
import { useCatalogoPropiedades } from '../hooks/useCatalogoPropiedades';
import { Button, EmptyState, Pagination, Spinner } from '../../../shared/components/ui';

const PAGE_SIZE = 12;

export default function CatalogoPage() {
  // La página vive en la URL (?page=2) para poder compartirla y que funcione el botón Atrás
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page')) || 1);

  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useCatalogoPropiedades({ page, pageSize: PAGE_SIZE });

  const propiedades = data?.data ?? [];
  const total       = data?.total ?? 0;
  const totalPages  = Math.ceil(total / PAGE_SIZE);

  // Si la página pedida ya no existe (p. ej. se despublicaron propiedades), ir a la última
  useEffect(() => {
    if (data && totalPages > 0 && page > totalPages) {
      setSearchParams({ page: String(totalPages) }, { replace: true });
    }
  }, [data, page, totalPages, setSearchParams]);

  function cambiarPagina(nueva) {
    setSearchParams(nueva === 1 ? {} : { page: String(nueva) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Propiedades</h1>
          <p className="text-sm text-secondary-500">Explora la oferta disponible en venta y alquiler</p>
        </div>
        {total > 0 && (
          <p className="text-sm text-secondary-500">
            {total} {total === 1 ? 'propiedad publicada' : 'propiedades publicadas'}
          </p>
        )}
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
