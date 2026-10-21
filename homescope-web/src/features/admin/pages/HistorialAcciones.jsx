import { Link, useSearchParams } from 'react-router-dom';
import { History } from 'lucide-react';
import { Card, EmptyState, Pagination, Select, Spinner, Button } from '../../../shared/components/ui';
import { useAccionesAdmin } from '../hooks/useAdmin';
import { ACCIONES, fechaHora } from '../components/comunes';

const PAGE_SIZE = 20;

// Sobre qué se hizo la acción (una publicación eliminada solo queda en el registro)
function Objetivo({ a }) {
  if (a.propiedad) return a.propiedad.eliminada
    ? <span className="text-secondary-700">{a.propiedad.titulo} <span className="text-xs text-secondary-500">(eliminada)</span></span>
    : <Link to={`/propiedades/${a.propiedad.id}`} className="text-primary-600 hover:text-primary-700">{a.propiedad.titulo}</Link>;
  if (a.usuario) return <span className="text-secondary-700">{a.usuario.nombre}</span>;
  return <span className="text-secondary-400">—</span>;
}

export default function HistorialAcciones() {
  const [params, setParams] = useSearchParams();
  const accion = Object.keys(ACCIONES).includes(params.get('accion')) ? params.get('accion') : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isPending, isError, refetch, isFetching } = useAccionesAdmin({ accion: accion || undefined, page, pageSize: PAGE_SIZE });

  const cambiar = (cambios) => setParams((actual) => {
    const nuevo = new URLSearchParams(actual);
    Object.entries(cambios).forEach(([k, v]) => (v ? nuevo.set(k, v) : nuevo.delete(k)));
    return nuevo;
  }, { replace: true });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section aria-labelledby="titulo-historial" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-historial" className="text-lg font-semibold text-secondary-900">Registro de acciones</h2>
          <p className="text-sm text-secondary-500">Cada acción de moderación con quién la hizo, cuándo y por qué.</p>
        </div>
        <Select id="filtro-accion" label="Acción" value={accion} onChange={(e) => cambiar({ accion: e.target.value || null, page: null })} className="w-56">
          <option value="">Todas</option>
          {Object.entries(ACCIONES).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </Select>
      </div>

      {isPending ? <div className="flex justify-center py-12"><Spinner /></div>
        : isError ? <EmptyState title="No se pudo cargar el registro" action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
        : data.data.length === 0 ? <EmptyState icon={History} title="Sin acciones registradas" />
        : (
          <>
            <Card className={['overflow-hidden transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
              {/* Tabla en pantallas medianas, lista en móvil */}
              <table className="hidden w-full text-sm md:table">
                <thead className="border-b border-secondary-200 bg-secondary-50 text-xs text-secondary-600">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Fecha</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Acción</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Sobre</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Motivo</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Administrador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {data.data.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-2.5 text-secondary-600">{fechaHora(a.fecha_accion)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-secondary-900">{ACCIONES[a.accion] ?? a.accion}</td>
                      <td className="px-4 py-2.5"><Objetivo a={a} /></td>
                      <td className="px-4 py-2.5 text-secondary-700 break-words">
                        {a.motivo}
                        {a.reporte_id && <span className="block text-xs text-secondary-400">Reporte #{a.reporte_id}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-secondary-600">{a.administrador.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-secondary-100 md:hidden">
                {data.data.map((a) => (
                  <li key={a.id} className="space-y-1 p-4 text-sm">
                    <p className="flex justify-between gap-2">
                      <span className="font-medium text-secondary-900">{ACCIONES[a.accion] ?? a.accion}</span>
                      <span className="text-xs text-secondary-500">{fechaHora(a.fecha_accion)}</span>
                    </p>
                    <p><Objetivo a={a} /></p>
                    <p className="text-secondary-700 break-words">{a.motivo}</p>
                    <p className="text-xs text-secondary-500">Por {a.administrador.nombre}{a.reporte_id && ` · Reporte #${a.reporte_id}`}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Pagination page={page} totalPages={totalPages} onPageChange={(n) => cambiar({ page: n > 1 ? String(n) : null })} />
          </>
        )}
    </section>
  );
}
