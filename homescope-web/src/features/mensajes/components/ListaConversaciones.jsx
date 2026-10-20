import { Link } from 'react-router-dom';
import { Home, MessagesSquare } from 'lucide-react';
import { Spinner } from '../../../shared/components/ui';
import { useConversaciones } from '../hooks/useMensajeria';
import { haceCuanto } from '../utils/tiempo';

function Conversacion({ c, activa }) {
  const ultimo = c.ultimo_mensaje;
  return (
    <Link
      to={`/mensajes/${c.id}`}
      aria-current={activa ? 'page' : undefined}
      className={[
        'flex gap-3 px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
        activa ? 'bg-primary-50' : 'hover:bg-secondary-50',
      ].join(' ')}
    >
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-secondary-100">
        {c.propiedad.portada
          ? <img src={c.propiedad.portada} alt="" className="h-full w-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center text-secondary-300"><Home size={20} aria-hidden="true" /></span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={['truncate text-sm', c.no_leidos ? 'font-semibold text-secondary-900' : 'font-medium text-secondary-800'].join(' ')}>
            {c.contraparte.nombre}
          </span>
          {ultimo && <span className="shrink-0 text-[11px] text-secondary-400">{haceCuanto(ultimo.fecha_envio)}</span>}
        </span>
        <span className="block truncate text-xs text-secondary-500">
          {c.rol === 'vendedor' ? 'Interesado en ' : ''}{c.propiedad.titulo}
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className={['truncate text-xs', c.no_leidos ? 'font-medium text-secondary-800' : 'text-secondary-500'].join(' ')}>
            {ultimo ? `${ultimo.es_mio ? 'Tú: ' : ''}${ultimo.contenido}` : 'Sin mensajes todavía'}
          </span>
          {c.no_leidos > 0 && (
            <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[11px] font-semibold text-white">
              <span className="sr-only">Sin leer: </span>{c.no_leidos}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

// Bandeja de conversaciones (como comprador y como vendedor); la de actividad más reciente arriba
export default function ListaConversaciones({ seleccionadaId }) {
  const { data, isPending, isError, refetch } = useConversaciones();
  const conversaciones = data?.data ?? [];

  if (isPending) return <Spinner label="Cargando conversaciones…" className="py-16" />;
  if (isError) {
    return (
      <div className="p-4 text-center text-sm text-secondary-600">
        No se pudieron cargar las conversaciones.{' '}
        <button type="button" onClick={() => refetch()} className="font-medium text-primary-600 hover:underline">Reintentar</button>
      </div>
    );
  }
  if (!conversaciones.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <MessagesSquare size={40} strokeWidth={1.5} className="text-secondary-300" aria-hidden="true" />
        <p className="text-sm font-medium text-secondary-700">Aún no tienes conversaciones</p>
        <p className="text-xs text-secondary-500">Escríbele a un vendedor desde la ficha de una propiedad.</p>
        <Link to="/propiedades" className="mt-1 text-sm font-medium text-primary-600 hover:underline">Ver propiedades</Link>
      </div>
    );
  }

  return (
    <nav aria-label="Conversaciones">
      <ul className="divide-y divide-secondary-100">
        {conversaciones.map((c) => (
          <li key={c.id}><Conversacion c={c} activa={c.id === seleccionadaId} /></li>
        ))}
      </ul>
    </nav>
  );
}
