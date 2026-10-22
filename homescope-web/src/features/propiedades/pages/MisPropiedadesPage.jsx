import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Eye, Home, ImageOff, Pause, Pencil, Play, Plus, RefreshCw, Trash2,
} from 'lucide-react';
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Pagination, Spinner, useToast,
} from '../../../shared/components/ui';
import { useAccionPropiedad, useMisPropiedades } from '../hooks/useMisPropiedades';
import { formatearFecha, formatearPrecio } from '../utils/formato';
import { AvisoVerificacion } from '../../verificacion';

const PAGE_SIZE = 10;

// Pestañas: el valor es el `estado` que acepta GET /propiedades/mias (cerrada = vendidas y alquiladas)
const PESTANAS = [
  { valor: 'todas',     etiqueta: 'Todas' },
  { valor: 'borrador',  etiqueta: 'Borradores' },
  { valor: 'publicado', etiqueta: 'Publicadas' },
  { valor: 'pausado',   etiqueta: 'Pausadas' },
  { valor: 'cerrada',   etiqueta: 'Vendidas/Alquiladas' },
];

const ESTADOS = {
  borrador:  { etiqueta: 'Borrador',  variant: 'default' },
  publicado: { etiqueta: 'Publicada', variant: 'success' },
  pausado:   { etiqueta: 'Pausada',   variant: 'warning' },
  vendido:   { etiqueta: 'Vendida',   variant: 'primary' },
  alquilado: { etiqueta: 'Alquilada', variant: 'primary' },
};

const VACIO_POR_PESTANA = {
  borrador:  'No tienes borradores.',
  publicado: 'No tienes anuncios publicados.',
  pausado:   'No tienes anuncios pausados.',
  cerrada:   'Aún no has vendido ni alquilado ninguna propiedad.',
};

// Cierre según la modalidad: una propiedad en venta se marca vendida y una en alquiler, alquilada
const cierre = (p) => (p.modalidad === 'alquiler'
  ? { estado: 'alquilado', etiqueta: 'Marcar como alquilada', participio: 'alquilada' }
  : { estado: 'vendido',   etiqueta: 'Marcar como vendida',   participio: 'vendida' });

function textoVencimiento(p) {
  if (p.expirada) return `Este anuncio venció el ${formatearFecha(p.fecha_expiracion)}. Renuévalo para mantenerlo activo.`;
  if (p.dias_para_expirar === 0) return 'Este anuncio vence hoy. Renuévalo para mantenerlo activo.';
  return `Este anuncio vence en ${p.dias_para_expirar} ${p.dias_para_expirar === 1 ? 'día' : 'días'}. Renuévalo para mantenerlo activo.`;
}

function TarjetaPropiedad({ propiedad: p, onAccion, onConfirmar, pendiente, error }) {
  const navigate = useNavigate();
  const estado = ESTADOS[p.estado] ?? { etiqueta: p.estado, variant: 'default' };
  const ocupada = Boolean(pendiente);
  const cargando = (accion) => pendiente === accion;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 shrink-0 bg-secondary-100 aspect-video sm:aspect-auto sm:h-auto">
          {p.portada ? (
            <img src={p.portada} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full min-h-32 flex flex-col items-center justify-center text-secondary-400 text-xs gap-1">
              <ImageOff size={24} aria-hidden="true" /> Sin fotos
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold text-secondary-900 break-words">{p.titulo}</h2>
            <Badge variant={estado.variant} className="shrink-0">{estado.etiqueta}</Badge>
          </div>

          <p className="text-lg font-bold text-primary-700">
            {formatearPrecio(p.precio, p.moneda)}
            {p.modalidad === 'alquiler' && <span className="text-sm font-normal text-secondary-500"> /mes</span>}
          </p>

          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary-500">
            {p.estado === 'borrador' ? (
              <div><dt className="inline">Sin publicar · </dt><dd className="inline">paso {p.paso_formulario ?? 1} de 4</dd></div>
            ) : (
              <div>
                <dt className="inline">Publicada: </dt>
                <dd className="inline">{p.fecha_publicacion ? formatearFecha(p.fecha_publicacion) : '—'}</dd>
              </div>
            )}
            {['publicado', 'pausado'].includes(p.estado) && p.fecha_expiracion && (
              <div>
                <dt className="inline">{p.expirada ? 'Venció: ' : 'Vence: '}</dt>
                <dd className="inline">{formatearFecha(p.fecha_expiracion)}</dd>
              </div>
            )}
          </dl>

          {p.estado === 'publicado' && p.por_expirar && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-warning-200 bg-warning-50 p-2 text-sm text-warning-800">
              <span className="flex items-start gap-1.5 flex-1">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                {textoVencimiento(p)}
              </span>
              <Button
                size="sm" variant="secondary" disabled={ocupada} loading={cargando('renovar')}
                onClick={() => onAccion(p, { accion: 'renovar' })}
              >
                <RefreshCw size={14} aria-hidden="true" /> Renovar
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded border border-danger-200 bg-danger-50 p-2 text-sm text-danger-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {p.estado === 'borrador' && (<>
              <Button size="sm" onClick={() => navigate(`/publicar?borrador=${p.id}`)} disabled={ocupada}>
                <Play size={14} aria-hidden="true" /> Continuar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onConfirmar(p, 'eliminar')} disabled={ocupada}>
                <Trash2 size={14} aria-hidden="true" /> Eliminar
              </Button>
            </>)}

            {p.estado === 'publicado' && (<>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/propiedades/${p.id}`)}>
                <Eye size={14} aria-hidden="true" /> Ver ficha
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/mis-propiedades/${p.id}/editar`)} disabled={ocupada}>
                <Pencil size={14} aria-hidden="true" /> Editar
              </Button>
              <Button
                size="sm" variant="secondary" disabled={ocupada} loading={cargando('pausado')}
                onClick={() => onAccion(p, { accion: 'estado', estado: 'pausado' })}
              >
                <Pause size={14} aria-hidden="true" /> Pausar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onConfirmar(p, 'cerrar')} disabled={ocupada}>
                <CheckCircle2 size={14} aria-hidden="true" /> {cierre(p).etiqueta}
              </Button>
            </>)}

            {p.estado === 'pausado' && (<>
              <Button
                size="sm" disabled={ocupada} loading={cargando('publicado')}
                onClick={() => onAccion(p, { accion: 'estado', estado: 'publicado' })}
              >
                <Play size={14} aria-hidden="true" /> Reactivar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/mis-propiedades/${p.id}/editar`)} disabled={ocupada}>
                <Pencil size={14} aria-hidden="true" /> Editar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onConfirmar(p, 'eliminar')} disabled={ocupada}>
                <Trash2 size={14} aria-hidden="true" /> Eliminar
              </Button>
            </>)}

            {['vendido', 'alquilado'].includes(p.estado) && (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/propiedades/${p.id}`)}>
                <Eye size={14} aria-hidden="true" /> Ver ficha
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function MisPropiedadesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const estado = PESTANAS.some((t) => t.valor === searchParams.get('estado')) ? searchParams.get('estado') : 'todas';
  const page   = Math.max(1, Number(searchParams.get('page')) || 1);
  const toast  = useToast();
  const navigate = useNavigate();

  const { data, isPending, isError, refetch, isFetching } = useMisPropiedades({ estado, page, pageSize: PAGE_SIZE });
  const accion = useAccionPropiedad();
  const [confirmando, setConfirmando] = useState(null); // { propiedad, tipo: 'eliminar' | 'cerrar' }
  const [errores, setErrores] = useState({});           // id → mensaje del backend

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Si al eliminar o cambiar de estado la página actual queda vacía, ir a la última que tenga elementos
  useEffect(() => {
    if (data && page > totalPages) irA({ page: totalPages });
  }, [data, page, totalPages]);

  function irA({ estado: nuevoEstado = estado, page: nuevaPagina = 1 }) {
    const params = new URLSearchParams();
    if (nuevoEstado !== 'todas') params.set('estado', nuevoEstado);
    if (nuevaPagina > 1) params.set('page', nuevaPagina);
    setSearchParams(params, { replace: nuevoEstado === estado });
  }

  function ejecutar(propiedad, variables, mensajeExito) {
    setErrores(({ [propiedad.id]: _, ...resto }) => resto);
    accion.mutate({ id: propiedad.id, ...variables }, {
      onSuccess: () => {
        setConfirmando(null);
        toast(mensajeExito, 'success');
      },
      onError: (err) => {
        setConfirmando(null);
        // Errores de política (p. ej. correo sin verificar al reactivar): se muestra el mensaje del backend
        const mensaje = err?.message ?? 'No se pudo completar la acción';
        setErrores((e) => ({ ...e, [propiedad.id]: mensaje }));
        toast(mensaje, 'error');
      },
    });
  }

  function onAccion(propiedad, variables) {
    const mensajes = {
      renovar:   'Anuncio renovado por 60 días más',
      pausado:   'Anuncio pausado: ya no aparece en el catálogo',
      publicado: 'Anuncio reactivado',
    };
    ejecutar(propiedad, variables, mensajes[variables.estado ?? variables.accion]);
  }

  function confirmar() {
    const { propiedad, tipo } = confirmando;
    if (tipo === 'eliminar') return ejecutar(propiedad, { accion: 'eliminar' }, 'Propiedad eliminada');
    const { estado: nuevoEstado, participio } = cierre(propiedad);
    ejecutar(propiedad, { accion: 'estado', estado: nuevoEstado }, `Propiedad marcada como ${participio}`);
  }

  // Botón de la acción en curso, para mostrarlo cargando en su tarjeta
  const pendiente = accion.isPending ? accion.variables : null;
  const pendienteDe = (id) => (pendiente?.id === id ? (pendiente.estado ?? pendiente.accion) : null);

  const conteos = data?.conteos;
  const sinPropiedades = conteos?.todas === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-secondary-900">Mis propiedades</h1>
        {!sinPropiedades && (
          <Button size="sm" onClick={() => navigate('/publicar')}>
            <Plus size={16} aria-hidden="true" /> Publicar propiedad
          </Button>
        )}
      </div>

      {/* Sin identidad verificada no se puede publicar ni reactivar */}
      <AvisoVerificacion className="mb-6" />

      {!sinPropiedades && (
        <div className="mb-6 -mx-4 px-4 overflow-x-auto">
          <div role="tablist" aria-label="Filtrar por estado" className="flex gap-1 border-b border-secondary-200 min-w-max">
            {PESTANAS.map((t) => {
              const activa = t.valor === estado;
              return (
                <button
                  key={t.valor}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => irA({ estado: t.valor })}
                  className={[
                    'px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-t',
                    activa
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-secondary-500 hover:text-secondary-800',
                  ].join(' ')}
                >
                  {t.etiqueta}
                  {conteos && (
                    <span className={[
                      'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                      activa ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-600',
                    ].join(' ')}>
                      {conteos[t.valor] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isPending ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="No se pudieron cargar tus propiedades"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}
        />
      ) : sinPropiedades ? (
        <EmptyState
          icon={Home}
          title="Aún no tienes propiedades"
          description="Publica tu primera propiedad para que los compradores puedan encontrarla."
          action={(
            <Button onClick={() => navigate('/publicar')}>
              <Plus size={16} aria-hidden="true" /> Publicar mi primera propiedad
            </Button>
          )}
        />
      ) : data.data.length === 0 ? (
        <EmptyState title="Sin propiedades aquí" description={VACIO_POR_PESTANA[estado]} />
      ) : (
        <>
          <ul className={['space-y-4 transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
            {data.data.map((p) => (
              <li key={p.id}>
                <TarjetaPropiedad
                  propiedad={p}
                  onAccion={onAccion}
                  onConfirmar={(propiedad, tipo) => setConfirmando({ propiedad, tipo })}
                  pendiente={pendienteDe(p.id)}
                  error={errores[p.id]}
                />
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Pagination page={page} totalPages={totalPages} onPageChange={(n) => irA({ page: n })} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(confirmando)}
        onClose={() => !accion.isPending && setConfirmando(null)}
        onConfirm={confirmar}
        loading={accion.isPending}
        {...(confirmando?.tipo === 'eliminar' ? {
          title:        '¿Eliminar esta propiedad?',
          message:      `"${confirmando.propiedad.titulo}" y sus fotos se eliminarán definitivamente. Esta acción no se puede deshacer.`,
          confirmLabel: 'Eliminar',
          variant:      'danger',
        } : confirmando ? {
          title:        `¿${cierre(confirmando.propiedad).etiqueta}?`,
          message:      `"${confirmando.propiedad.titulo}" dejará de aparecer en el catálogo y ya no podrás editarla ni reactivarla.`,
          confirmLabel: cierre(confirmando.propiedad).etiqueta,
          variant:      'primary',
        } : {})}
      />
    </div>
  );
}
