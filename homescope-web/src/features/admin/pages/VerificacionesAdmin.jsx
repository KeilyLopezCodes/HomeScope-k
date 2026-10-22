import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, CheckCircle2, FileText, XCircle } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Modal, Pagination, Spinner, useToast } from '../../../shared/components/ui';
import { useAuth } from '../../auth';
import DialogoAccion from '../components/DialogoAccion';
import { Filtros } from '../components/comunes';
import { descargarDocumento, listarVerificaciones, resolverVerificacion, TIPOS_DOCUMENTO } from '../../verificacion/services/verificacionService';

const PAGE_SIZE = 10;
const VISTAS = [
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'aprobada',  etiqueta: 'Aprobadas' },
  { valor: 'rechazada', etiqueta: 'Rechazadas' },
];
const ESTADO = {
  pendiente: { etiqueta: 'Pendiente', variant: 'warning' },
  aprobada:  { etiqueta: 'Aprobada',  variant: 'success' },
  rechazada: { etiqueta: 'Rechazada', variant: 'danger' },
};
const fechaHora = (f) => (f ? new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(f)) : '—');

// El documento es privado: se descarga con el token y se muestra desde un blob local
function VisorDocumento({ solicitud, onCerrar }) {
  const [estado, setEstado] = useState({ cargando: true });
  useEffect(() => {
    if (!solicitud) return undefined;
    let url = null;
    let vigente = true;
    setEstado({ cargando: true });
    descargarDocumento(solicitud.id)
      .then((blob) => { url = URL.createObjectURL(blob); if (vigente) setEstado({ url, tipo: blob.type }); })
      .catch((err) => vigente && setEstado({ error: err.message }));
    return () => { vigente = false; if (url) URL.revokeObjectURL(url); };
  }, [solicitud?.id]);

  return (
    <Modal open={Boolean(solicitud)} onClose={onCerrar} title={solicitud ? `${TIPOS_DOCUMENTO[solicitud.tipo_documento]} de ${solicitud.usuario.nombre}` : ''} size="lg">
      {estado.cargando ? <div className="flex justify-center py-12"><Spinner /></div>
        : estado.error ? <p role="alert" className="text-sm text-danger-700">{estado.error}</p>
        : estado.tipo === 'application/pdf'
          ? <iframe src={estado.url} title="Documento de identidad" className="h-[70vh] w-full rounded border border-secondary-200" />
          : <img src={estado.url} alt="Documento de identidad enviado" className="mx-auto max-h-[70vh] rounded border border-secondary-200 object-contain" />}
      <p className="mt-3 text-xs text-secondary-500">Documento privado: no se guarda en el navegador ni tiene un enlace público.</p>
    </Modal>
  );
}

export default function VerificacionesAdmin() {
  const [params, setParams] = useSearchParams();
  const { sesionVerificada } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const estado = VISTAS.some((v) => v.valor === params.get('estado')) ? params.get('estado') : 'pendiente';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [viendo, setViendo] = useState(null);
  const [aprobando, setAprobando] = useState(null);
  const [rechazando, setRechazando] = useState(null);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'verificaciones', estado, page],
    queryFn:  () => listarVerificaciones({ estado, page, pageSize: PAGE_SIZE }),
    enabled:  sesionVerificada,
    placeholderData: keepPreviousData,
  });
  const resolver = useMutation({
    mutationFn: ({ id, ...datos }) => resolverVerificacion(id, datos),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const cambiar = (cambios) => setParams((actual) => {
    const nuevo = new URLSearchParams(actual);
    Object.entries(cambios).forEach(([k, v]) => (v ? nuevo.set(k, v) : nuevo.delete(k)));
    return nuevo;
  }, { replace: true });

  function aprobar() {
    resolver.mutate({ id: aprobando.id, estado: 'aprobada' }, {
      onSuccess: () => { toast(`${aprobando.usuario.nombre} ya es vendedor verificado`, 'success'); setAprobando(null); },
      onError:   (err) => { toast(err.message ?? 'No se pudo aprobar', 'error'); setAprobando(null); },
    });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section aria-labelledby="titulo-verificaciones" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-verificaciones" className="text-lg font-semibold text-secondary-900">Verificación de vendedores</h2>
          <p className="text-sm text-secondary-500">Revisa el documento y aprueba o rechaza. Solo los vendedores verificados pueden publicar.</p>
        </div>
        <Filtros etiqueta="Estado de la solicitud" opciones={VISTAS} valor={estado} onCambiar={(v) => cambiar({ estado: v === 'pendiente' ? null : v, page: null })} />
      </div>

      {isPending ? <div className="flex justify-center py-12"><Spinner /></div>
        : isError ? <EmptyState title="No se pudieron cargar las solicitudes" action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>} />
        : data.data.length === 0 ? <EmptyState icon={BadgeCheck} title={estado === 'pendiente' ? 'No hay solicitudes por revisar' : 'No hay solicitudes en este estado'} />
        : (
          <>
            <ul className={['space-y-3 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
              {data.data.map((v) => (
                <li key={v.id}>
                  <Card className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-secondary-900 break-words">{v.usuario.nombre}</p>
                        <p className="text-xs text-secondary-500 break-all">{v.usuario.email}</p>
                        <p className="text-xs text-secondary-500">
                          {TIPOS_DOCUMENTO[v.tipo_documento]} · enviado {fechaHora(v.fecha_solicitud)} · {v.usuario.propiedades} {v.usuario.propiedades === 1 ? 'propiedad' : 'propiedades'}
                        </p>
                      </div>
                      <Badge variant={ESTADO[v.estado].variant}>{ESTADO[v.estado].etiqueta}</Badge>
                    </div>
                    {v.estado !== 'pendiente' && (
                      <p className="text-xs text-secondary-500">
                        Revisada por {v.revisor?.nombre ?? '—'} el {fechaHora(v.fecha_revision)}
                        {v.motivo_rechazo && <span className="block text-sm text-secondary-700">Motivo: {v.motivo_rechazo}</span>}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="secondary" onClick={() => setViendo(v)}><FileText size={14} aria-hidden="true" /> Ver documento</Button>
                      {v.estado === 'pendiente' && (<>
                        <Button size="sm" onClick={() => setAprobando(v)}><CheckCircle2 size={14} aria-hidden="true" /> Aprobar</Button>
                        <Button size="sm" variant="secondary" className="text-danger-700" onClick={() => setRechazando(v)}><XCircle size={14} aria-hidden="true" /> Rechazar</Button>
                      </>)}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} onPageChange={(n) => cambiar({ page: n > 1 ? String(n) : null })} />
          </>
        )}

      <VisorDocumento solicitud={viendo} onCerrar={() => setViendo(null)} />
      <ConfirmDialog
        open={Boolean(aprobando)}
        onClose={() => !resolver.isPending && setAprobando(null)}
        onConfirm={aprobar}
        loading={resolver.isPending}
        title="¿Aprobar la verificación?"
        message={aprobando && `${aprobando.usuario.nombre} podrá publicar propiedades y su perfil mostrará la insignia de vendedor verificado. Recibirá una notificación.`}
        confirmLabel="Aprobar"
        variant="primary"
      />
      <DialogoAccion
        accion={rechazando && {
          titulo: 'Rechazar la verificación', confirmar: 'Rechazar', variante: 'danger', objetivo: rechazando.usuario.nombre,
          descripcion: 'El vendedor verá el motivo y podrá enviar su documento de nuevo.',
          etiquetaMotivo: 'Motivo del rechazo (lo verá el vendedor)', ejemplo: 'Ej.: La foto está borrosa y no se lee el nombre.',
        }}
        onCerrar={() => setRechazando(null)}
        enviando={resolver.isPending}
        onConfirmar={async (motivo) => {
          await resolver.mutateAsync({ id: rechazando.id, estado: 'rechazada', motivo_rechazo: motivo });
          toast('Solicitud rechazada', 'success');
          setRechazando(null);
        }}
      />
    </section>
  );
}
