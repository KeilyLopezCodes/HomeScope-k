import { Link } from 'react-router-dom';
import { Button, Spinner } from '../../../shared/components/ui';
import { Estrellas } from './Estrellas';
import { useResenasVendedor } from '../hooks/useResenas';
import { fechaResena } from '../utils/fechas';

function Resena({ r, propiedadActual }) {
  return (
    <li className="py-4 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-100 text-xs font-semibold text-secondary-600">
            {r.comprador.nombre[0]?.toUpperCase()}
          </span>
          <div>
            <p className="text-sm font-medium text-secondary-900">{r.comprador.nombre}</p>
            <p className="text-xs text-secondary-500">{fechaResena(r.fecha_creacion)}</p>
          </div>
        </div>
        <Estrellas valor={r.calificacion} tamano={14} />
      </div>
      {r.comentario
        ? <p className="mt-2 whitespace-pre-line text-sm text-secondary-700">{r.comentario}</p>
        : <p className="mt-2 text-sm italic text-secondary-400">Calificó sin dejar comentario.</p>}
      {/* En la ficha de otra propiedad (o en el perfil) se indica sobre qué propiedad es la reseña */}
      {r.propiedad.id !== propiedadActual && (
        <p className="mt-1 text-xs text-secondary-500">
          Sobre <Link to={`/propiedades/${r.propiedad.id}`} className="text-primary-600 hover:underline">{r.propiedad.titulo}</Link>
        </p>
      )}
    </li>
  );
}

// Reseñas del vendedor, de la más reciente a la más antigua
export default function ListaResenas({ vendedorId, propiedadActual = null, pageSize = 5 }) {
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useResenasVendedor(vendedorId, { pageSize });

  if (isPending) return <Spinner label="Cargando reseñas…" className="py-8" />;
  if (isError) {
    return (
      <p className="text-sm text-secondary-600">
        No se pudieron cargar las reseñas.{' '}
        <button type="button" onClick={() => refetch()} className="font-medium text-primary-600 hover:underline">Reintentar</button>
      </p>
    );
  }

  const resenas = data.pages.flatMap((p) => p.data);
  if (!resenas.length) return null;
  const total = data.pages[0].total;

  return (
    <div>
      <ul className="divide-y divide-secondary-100">
        {resenas.map((r) => <Resena key={r.id} r={r} propiedadActual={propiedadActual} />)}
      </ul>
      {hasNextPage && (
        <div className="mt-2 flex justify-center">
          <Button variant="text" size="sm" onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            Ver más reseñas ({total - resenas.length} más)
          </Button>
        </div>
      )}
    </div>
  );
}
