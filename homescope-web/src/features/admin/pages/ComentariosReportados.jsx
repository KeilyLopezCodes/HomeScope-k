import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, EyeOff, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Pagination, Spinner } from '../../../shared/components/ui';
import { useReportesAdmin, useResolverReporte } from '../hooks/useAdmin';
import { useDialogoModeracion } from '../hooks/useDialogoModeracion';
import { Filtros, MOTIVOS, fechaHora } from '../components/comunes';

const PAGE_SIZE = 10;
const VISTAS = [
  { valor: 'pendiente',   etiqueta: 'Pendientes' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'resuelto',    etiqueta: 'Resueltos' },
  { valor: 'descartado',  etiqueta: 'Descartados' },
];
const ESTADO_REPORTE = {
  pendiente:   { etiqueta: 'Pendiente',   variant: 'warning' },
  en_revision: { etiqueta: 'En revisión', variant: 'primary' },
  resuelto:    { etiqueta: 'Resuelto',    variant: 'success' },
  descartado:  { etiqueta: 'Descartado',  variant: 'default' },
};

const ACCION = {
  ocultar: {
    titulo: 'Ocultar comentario', confirmar: 'Ocultar', variante: 'danger',
    descripcion: 'Deja de mostrarse a todos en la ficha de la propiedad y los demás reportes sobre él quedan resueltos.',
    exito: 'Comentario ocultado',
  },
  descartar: {
    titulo: 'Descartar reporte', confirmar: 'Descartar', variante: 'primary',
    descripcion: 'El reporte no procede: el comentario sigue visible.',
    exito: 'Reporte descartado',
  },
};

export default function ComentariosReportados() {
  const [params, setParams] = useSearchParams();
  const estado = VISTAS.some((v) => v.valor === params.get('estado')) ? params.get('estado') : 'pendiente';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { data, isPending, isError, refetch, isFetching } = useReportesAdmin({ tipo: 'comentario', estado, page, pageSize: PAGE_SIZE });
  const resolver = useResolverReporte();
  const { abrir, dialogo } = useDialogoModeracion();

  const cambiar = (cambios) => setParams((actual) => {
    const nuevo = new URLSearchParams(actual);
    Object.entries(cambios).forEach(([k, v]) => (v ? nuevo.set(k, v) : nuevo.delete(k)));
    return nuevo;
  }, { replace: true });

  const onAccion = (tipo, r) => abrir(
    { ...ACCION[tipo], objetivo: `"${r.comentario.texto}"` },
    (motivo) => resolver.mutateAsync(tipo === 'ocultar'
      ? { id: r.id, estado: 'resuelto', ocultar_comentario: true, motivo }
      : { id: r.id, estado: 'descartado', motivo }),
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const abiertos = ['pendiente', 'en_revision'].includes(estado);

  return (
    <section aria-labelledby="titulo-comentarios" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-comentarios" className="text-lg font-semibold text-secondary-900">Comentarios de zona reportados</h2>
        <Filtros etiqueta="Estado del reporte" opciones={VISTAS} valor={estado} onCambiar={(v) => cambiar({ estado: v === 'pendiente' ? null : v, page: null })} />
      </div>

      {isPending ? <div className="flex justify-center py-12"><Spinner /></div>
        : isError ? <EmptyState title="No se pudieron cargar los reportes" action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
        : data.data.length === 0 ? <EmptyState icon={CheckCircle2} title="No hay reportes en este estado" />
        : (
          <>
            <ul className={['space-y-3 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
              {data.data.map((r) => (
                <li key={r.id}>
                  <Card className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary-500">
                      <span>
                        Reporte #{r.id} · <span className="font-medium text-secondary-800">{MOTIVOS[r.motivo] ?? r.motivo}</span>
                        {' '}· por {r.reportante?.nombre} · {fechaHora(r.fecha_creacion)}
                      </span>
                      <div className="flex gap-1.5">
                        {r.comentario.estado === 'oculto' && <Badge variant="danger">Comentario oculto</Badge>}
                        <Badge variant={ESTADO_REPORTE[r.estado].variant}>{ESTADO_REPORTE[r.estado].etiqueta}</Badge>
                      </div>
                    </div>
                    <blockquote className="border-l-4 border-secondary-300 pl-3 text-sm text-secondary-800 break-words">
                      {r.comentario.texto}
                    </blockquote>
                    <p className="text-xs text-secondary-500">
                      De {r.comentario.autor?.nombre} en{' '}
                      <Link to={`/propiedades/${r.comentario.propiedad?.id}`} className="text-primary-600 hover:text-primary-700">{r.comentario.propiedad?.titulo}</Link>
                      {r.comentario.reportes_abiertos > 1 && ` · ${r.comentario.reportes_abiertos} reportes abiertos sobre este comentario`}
                    </p>
                    {r.descripcion && <p className="text-sm text-secondary-600 break-words">Detalle del reporte: {r.descripcion}</p>}
                    {abiertos && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {r.comentario.estado === 'visible' && (
                          <Button size="sm" variant="secondary" className="text-danger-700" onClick={() => onAccion('ocultar', r)}>
                            <EyeOff size={14} aria-hidden="true" /> Ocultar comentario
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => onAccion('descartar', r)}>
                          <XCircle size={14} aria-hidden="true" /> Descartar reporte
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={(n) => cambiar({ page: n > 1 ? String(n) : null })} />
          </>
        )}
      {dialogo}
    </section>
  );
}

