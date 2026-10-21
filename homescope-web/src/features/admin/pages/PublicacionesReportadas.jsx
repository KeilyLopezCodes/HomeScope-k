import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Flag, ImageOff, PauseCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Pagination, Spinner } from '../../../shared/components/ui';
import { formatearPrecio } from '../../propiedades/utils/formato';
import { useEjecutarAccion, usePropiedadesAdmin } from '../hooks/useAdmin';
import { useDialogoModeracion } from '../hooks/useDialogoModeracion';
import { BadgeEstado, ChipsMotivos, ESTADOS_PROPIEDAD, Filtros, ListaReportes, fecha } from '../components/comunes';

const PAGE_SIZE = 10;
const VISTAS = [
  { valor: 'reportadas', etiqueta: 'Reportadas' },
  { valor: 'pausadas',   etiqueta: 'Pausadas por moderación' },
];

// Textos del diálogo de cada acción
const ACCION = {
  aprobar: (p) => ({
    titulo: 'Aprobar publicación', confirmar: 'Aprobar', variante: 'primary',
    descripcion: p.pausada_por_moderacion
      ? 'Vuelve a publicarse y se descartan sus reportes abiertos.'
      : 'Los reportes no proceden: se descartan y la publicación sigue igual.',
    exito: p.pausada_por_moderacion ? 'Publicación aprobada y publicada de nuevo' : 'Reportes descartados',
  }),
  pausar: () => ({
    titulo: 'Pausar publicación', confirmar: 'Pausar', variante: 'primary',
    descripcion: 'Deja de verse en el catálogo y sus reportes quedan resueltos. El vendedor no podrá reactivarla hasta que la apruebes. Recibirá una notificación con el motivo.',
    exito: 'Publicación pausada',
  }),
  eliminar: () => ({
    titulo: 'Eliminar publicación', confirmar: 'Eliminar', variante: 'danger', irreversible: true,
    descripcion: 'Se borra con todas sus fotos y sus reportes. El registro de acciones conserva su título y vendedor.',
    exito: 'Publicación eliminada',
  }),
};

function TarjetaPublicacion({ p, onAccion }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="aspect-video shrink-0 bg-secondary-100 sm:aspect-auto sm:w-44">
          {p.portada
            ? <img src={p.portada} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <div className="flex h-full min-h-28 items-center justify-center text-secondary-400"><ImageOff size={24} aria-label="Sin fotos" /></div>}
        </div>
        <div className="min-w-0 flex-1 space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/propiedades/${p.id}`} className="font-semibold text-secondary-900 hover:text-primary-700 break-words">{p.titulo}</Link>
              <p className="text-xs text-secondary-500">
                {formatearPrecio(p.precio, p.moneda)} · Vendedor: {p.vendedor.nombre}
                {p.vendedor.estado === 'suspendido' && ' (cuenta suspendida)'} · Publicada: {fecha(p.fecha_publicacion)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <BadgeEstado estados={ESTADOS_PROPIEDAD} estado={p.estado} />
              {p.pausada_por_moderacion && <Badge variant="danger"><ShieldAlert size={12} aria-hidden="true" /> Pausada por moderación</Badge>}
            </div>
          </div>

          {p.reportes_abiertos > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-danger-700">
                <Flag size={14} aria-hidden="true" />
                {p.reportes_abiertos} {p.reportes_abiertos === 1 ? 'reporte abierto' : 'reportes abiertos'}
              </p>
              <ChipsMotivos motivos={p.motivos} />
              <ListaReportes reportes={p.reportes} />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {(p.reportes_abiertos > 0 || p.pausada_por_moderacion) && (
              <Button size="sm" onClick={() => onAccion('aprobar', p)}>
                <CheckCircle2 size={14} aria-hidden="true" /> Aprobar
              </Button>
            )}
            {p.estado === 'publicado' && (
              <Button size="sm" variant="secondary" onClick={() => onAccion('pausar', p)}>
                <PauseCircle size={14} aria-hidden="true" /> Pausar
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => onAccion('eliminar', p)} className="text-danger-700">
              <Trash2 size={14} aria-hidden="true" /> Eliminar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function PublicacionesReportadas() {
  const [params, setParams] = useSearchParams();
  const vista = params.get('vista') === 'pausadas' ? 'pausadas' : 'reportadas';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const filtros = vista === 'pausadas'
    ? { pausadas_por_moderacion: true, page, pageSize: PAGE_SIZE }
    : { reportadas: true, page, pageSize: PAGE_SIZE };
  const { data, isPending, isError, refetch, isFetching } = usePropiedadesAdmin(filtros);
  const ejecutar = useEjecutarAccion();
  const { abrir, dialogo } = useDialogoModeracion();

  const cambiar = (cambios) => setParams((actual) => {
    const nuevo = new URLSearchParams(actual);
    Object.entries(cambios).forEach(([k, v]) => (v ? nuevo.set(k, v) : nuevo.delete(k)));
    return nuevo;
  }, { replace: true });

  const onAccion = (accion, p) => abrir(
    { ...ACCION[accion](p), objetivo: p.titulo },
    (motivo) => ejecutar.mutateAsync({ accion, propiedad_id: p.id, motivo }),
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section aria-labelledby="titulo-publicaciones" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-publicaciones" className="text-lg font-semibold text-secondary-900">Publicaciones</h2>
        <Filtros etiqueta="Publicaciones" opciones={VISTAS} valor={vista} onCambiar={(v) => cambiar({ vista: v === 'reportadas' ? null : v, page: null })} />
      </div>

      {isPending ? <div className="flex justify-center py-12"><Spinner /></div>
        : isError ? <EmptyState title="No se pudieron cargar las publicaciones" action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
        : data.data.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={vista === 'pausadas' ? 'No hay publicaciones pausadas por moderación' : 'No hay publicaciones reportadas'}
            description={vista === 'pausadas' ? 'Las que pauses aparecerán aquí para aprobarlas cuando se corrijan.' : 'Cuando alguien reporte una publicación aparecerá aquí.'}
          />
        ) : (
          <>
            <ul className={['space-y-3 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
              {data.data.map((p) => <li key={p.id}><TarjetaPublicacion p={p} onAccion={onAccion} /></li>)}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={(n) => cambiar({ page: n > 1 ? String(n) : null })} />
          </>
        )}
      {dialogo}
    </section>
  );
}
