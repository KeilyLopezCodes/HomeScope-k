import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CalendarDays } from 'lucide-react';
import { Button, EmptyState, Pagination, Spinner } from '../../../shared/components/ui';
import { useAuth } from '../../auth';
import VisitaCard from '../components/VisitaCard';
import { usePendientesVendedor, useVisitas } from '../hooks/useAgenda';

const POR_PAGINA = 10;
const ROLES_VENDEDOR = ['vendedor', 'seller', 'administrador', 'admin'];

const FILTROS = [
  { valor: 'solicitada',   etiqueta: 'Pendientes' },
  { valor: 'confirmada',   etiqueta: 'Confirmadas' },
  { valor: 'reprogramada', etiqueta: 'Reprogramadas' },
  { valor: 'cancelada',    etiqueta: 'Canceladas' },
  { valor: '',             etiqueta: 'Todas' },
];

const VACIO = {
  vendedor: {
    solicitada: 'No tienes solicitudes pendientes. Cuando un comprador pida una visita aparecerá aquí.',
    '':         'Aún no has recibido solicitudes de visita.',
  },
  comprador: {
    '': 'Aún no has solicitado visitas. Puedes pedir una desde la ficha de cualquier propiedad.',
  },
};

// /visitas: el vendedor ve las solicitudes recibidas (para confirmar o reprogramar) y cualquier usuario
// las visitas que pidió. Pestaña, filtro y página viven en la URL.
export default function VisitasPage() {
  const { user } = useAuth();
  const esVendedor = [user?.rol].flat().some((r) => ROLES_VENDEDOR.includes(String(r).toLowerCase()));
  const [params, setParams] = useSearchParams();

  const rol = esVendedor && params.get('rol') !== 'comprador' ? 'vendedor' : 'comprador';
  // El vendedor empieza viendo lo que espera su respuesta
  const estado = params.has('estado') ? params.get('estado') : (rol === 'vendedor' ? 'solicitada' : '');
  const page = Math.max(1, parseInt(params.get('page')) || 1);

  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useVisitas({ rol, estado: estado || undefined, page, pageSize: POR_PAGINA });
  const { data: pendientes = 0 } = usePendientesVendedor({ enabled: esVendedor });

  const navegar = (cambios) => {
    const siguiente = { rol, estado, ...cambios };
    setParams(Object.fromEntries(Object.entries(siguiente).filter(([k, v]) => v !== undefined && !(k === 'page' && v === 1))));
  };

  const visitas = data?.data ?? [];
  const totalPaginas = Math.ceil((data?.total ?? 0) / POR_PAGINA);
  const mensajeVacio = VACIO[rol][estado] ?? 'No hay visitas con este filtro.';

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-secondary-900">Visitas</h1>
      <p className="mb-5 text-sm text-secondary-500">
        {esVendedor ? 'Responde las solicitudes de visita a tus propiedades y revisa las que tú pediste.' : 'Las visitas que solicitaste y su estado.'}
      </p>

      {esVendedor && (
        <div role="tablist" aria-label="Tipo de visitas" className="mb-4 flex gap-1 border-b border-secondary-200">
          {[
            { valor: 'vendedor',  etiqueta: 'Solicitudes recibidas', contador: pendientes },
            { valor: 'comprador', etiqueta: 'Visitas que pedí' },
          ].map((t) => (
            <button
              key={t.valor}
              type="button"
              role="tab"
              aria-selected={rol === t.valor}
              onClick={() => setParams(t.valor === 'vendedor' ? {} : { rol: t.valor })}
              className={[
                '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                rol === t.valor ? 'border-primary-600 text-primary-700' : 'border-transparent text-secondary-500 hover:text-secondary-800',
              ].join(' ')}
            >
              {t.etiqueta}
              {t.contador > 0 && (
                <span className="rounded-full bg-warning-500 px-1.5 text-[11px] font-semibold text-white">
                  <span className="sr-only">pendientes: </span>{t.contador}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div role="group" aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor || 'todas'}
            type="button"
            aria-pressed={estado === f.valor}
            onClick={() => navegar({ estado: f.valor, page: 1 })}
            className={[
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              estado === f.valor ? 'border-primary-600 bg-primary-600 text-white' : 'border-secondary-300 bg-white text-secondary-600 hover:bg-secondary-50',
            ].join(' ')}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {isPending ? (
        <Spinner label="Cargando visitas…" className="py-16" />
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title="No se pudieron cargar las visitas"
          description={error?.message}
          action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
        />
      ) : visitas.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Sin visitas" description={mensajeVacio} />
      ) : (
        <>
          <div className={['space-y-3 transition-opacity', isPlaceholderData ? 'opacity-60' : ''].join(' ')}>
            {visitas.map((v) => <VisitaCard key={v.id} visita={v} />)}
          </div>
          <div className="mt-6">
            <Pagination page={page} totalPages={totalPaginas} onPageChange={(p) => navegar({ page: p })} />
          </div>
        </>
      )}
    </div>
  );
}
