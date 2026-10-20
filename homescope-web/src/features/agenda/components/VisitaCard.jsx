import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Check, MapPin, StickyNote, X } from 'lucide-react';
import { Badge, Button, ConfirmDialog, useToast } from '../../../shared/components/ui';
import ReprogramarVisitaModal from './ReprogramarVisitaModal';
import { useActualizarVisita } from '../hooks/useAgenda';
import { fechaHoraVisita, fechaVisita, horaVisita } from '../utils/fechas';

const ESTADOS = {
  solicitada:   { etiqueta: 'Pendiente',    variant: 'warning' },
  confirmada:   { etiqueta: 'Confirmada',   variant: 'success' },
  reprogramada: { etiqueta: 'Reprogramada', variant: 'primary' },
  cancelada:    { etiqueta: 'Cancelada',    variant: 'default' },
};

// visita: elemento de GET /visitas. Los botones dependen de visita.acciones (lo decide la API)
export default function VisitaCard({ visita }) {
  const actualizar = useActualizarVisita();
  const toast = useToast();
  const [reprogramando, setReprogramando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const pasada = new Date(visita.fecha_hora) <= new Date();
  const estado = pasada && visita.estado !== 'cancelada'
    ? { etiqueta: 'Ya pasó', variant: 'default' }
    : ESTADOS[visita.estado];
  const soyVendedor = visita.rol === 'vendedor';
  const { acciones } = visita;

  function cambiar(cambio, mensaje, alTerminar) {
    actualizar.mutate({ visita, cambio }, {
      onSuccess: () => { toast(mensaje, 'success'); alTerminar?.(); },
      onError: (err) => toast(err.message ?? 'No se pudo actualizar la visita', 'error'),
    });
  }

  return (
    <article className={['flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-start', visita.estado === 'solicitada' && soyVendedor && !pasada ? 'border-warning-300' : 'border-secondary-200'].join(' ')}>
      {/* Fecha */}
      <div className={['flex shrink-0 flex-col items-center justify-center rounded-md px-3 py-2 text-center sm:w-28', visita.estado === 'cancelada' || pasada ? 'bg-secondary-100 text-secondary-500' : 'bg-primary-50 text-primary-800'].join(' ')}>
        <span className="text-xs font-medium capitalize">{fechaVisita(visita.fecha_hora).split(',')[0]}</span>
        <span className="text-sm font-semibold">{fechaVisita(visita.fecha_hora).split(',')[1]?.trim()}</span>
        <span className="text-lg font-bold tabular-nums">{horaVisita(visita.fecha_hora)}</span>
      </div>

      {/* Detalle */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={estado.variant}>{estado.etiqueta}</Badge>
          <span className="text-xs text-secondary-500">
            {soyVendedor ? `Solicitada por ${visita.contraparte.nombre}` : `Con ${visita.contraparte.nombre} (vendedor)`}
          </span>
        </div>
        <Link to={`/propiedades/${visita.propiedad.id}`} className="block truncate font-semibold text-secondary-900 hover:text-primary-600">
          {visita.propiedad.titulo}
        </Link>
        <p className="flex items-start gap-1 text-xs text-secondary-500">
          <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          {[visita.propiedad.direccion, visita.propiedad.municipio].filter(Boolean).join(', ')}
        </p>
        {visita.estado === 'reprogramada' && (
          <p className="text-xs text-primary-700">
            Se pidió para el {fechaHoraVisita(visita.fecha_hora_solicitada)} y el vendedor la movió a este horario.
          </p>
        )}
        {visita.nota_comprador && (
          <p className="flex items-start gap-1 rounded bg-secondary-50 px-2 py-1 text-xs text-secondary-600">
            <StickyNote size={12} className="mt-0.5 shrink-0" aria-hidden="true" /> “{visita.nota_comprador}”
          </p>
        )}
      </div>

      {/* Acciones */}
      {(acciones.confirmar || acciones.reprogramar || acciones.cancelar) && (
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
          {acciones.confirmar && (
            <Button size="sm" loading={actualizar.isPending && actualizar.variables?.cambio.estado === 'confirmada'}
              onClick={() => cambiar({ estado: 'confirmada' }, `Visita confirmada. ${visita.contraparte.nombre} recibirá un aviso.`)}>
              <Check size={14} aria-hidden="true" /> Confirmar
            </Button>
          )}
          {acciones.reprogramar && (
            <Button size="sm" variant="secondary" onClick={() => setReprogramando(true)}>
              <CalendarClock size={14} aria-hidden="true" /> Reprogramar
            </Button>
          )}
          {acciones.cancelar && (
            <Button size="sm" variant="text" className="!text-danger-600 hover:!bg-danger-50" onClick={() => setCancelando(true)}>
              <X size={14} aria-hidden="true" /> Cancelar
            </Button>
          )}
        </div>
      )}

      {reprogramando && <ReprogramarVisitaModal visita={visita} onCerrar={() => setReprogramando(false)} />}
      <ConfirmDialog
        open={cancelando}
        onClose={() => setCancelando(false)}
        onConfirm={() => cambiar({ estado: 'cancelada' }, 'Visita cancelada.', () => setCancelando(false))}
        loading={actualizar.isPending}
        title="¿Cancelar la visita?"
        message={`${visita.contraparte.nombre} recibirá un aviso de que cancelaste la visita del ${fechaHoraVisita(visita.fecha_hora)}.`}
        confirmLabel="Sí, cancelar"
        cancelLabel="No"
      />
    </article>
  );
}
