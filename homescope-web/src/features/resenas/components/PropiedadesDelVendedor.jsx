import { useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, Building2 } from 'lucide-react';
import { Button, EmptyState, Pagination, Spinner } from '../../../shared/components/ui';
import { PropiedadCard } from '../../propiedades';
import { listarPropiedades } from '../../propiedades/services/propiedadesService';

const PAGE_SIZE = 6;

// Propiedades publicadas del vendedor, con las mismas tarjetas del catálogo (GET /propiedades?vendedor=)
export default function PropiedadesDelVendedor({ vendedorId, nombre }) {
  const [page, setPage] = useState(1);
  const seccion = useRef(null);
  const { data, isPending, isError, refetch, isPlaceholderData } = useQuery({
    queryKey: ['propiedades', 'vendedor', String(vendedorId), page],
    queryFn:  () => listarPropiedades({ page, pageSize: PAGE_SIZE, params: new URLSearchParams({ vendedor: vendedorId }) }),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function cambiarPagina(nueva) {
    setPage(nueva);
    seccion.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section ref={seccion} aria-labelledby="titulo-propiedades-vendedor" className="scroll-mt-20 rounded-lg border border-secondary-200 bg-white p-5">
      <h2 id="titulo-propiedades-vendedor" className="mb-4 text-base font-semibold text-secondary-900">
        Propiedades de {nombre} {total > 0 && <span className="font-normal text-secondary-500">({total})</span>}
      </h2>

      {isPending ? (
        <Spinner label="Cargando propiedades…" className="py-10" />
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title="No se pudieron cargar sus propiedades"
          action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
        />
      ) : total === 0 ? (
        <EmptyState icon={Building2} title="Sin propiedades publicadas" description={`${nombre} no tiene propiedades publicadas en este momento.`} />
      ) : (
        <>
          <ul
            aria-busy={isPlaceholderData}
            className={['grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3', isPlaceholderData ? 'opacity-60' : ''].join(' ')}
          >
            {data.data.map((p) => <li key={p.id}><PropiedadCard propiedad={p} /></li>)}
          </ul>
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={totalPages} onPageChange={cambiarPagina} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
