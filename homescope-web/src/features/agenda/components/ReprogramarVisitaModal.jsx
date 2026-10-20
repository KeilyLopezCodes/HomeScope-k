import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button, Modal, useToast } from '../../../shared/components/ui';
import SelectorHorario from './SelectorHorario';
import { useActualizarVisita } from '../hooks/useAgenda';
import { fechaHoraVisita } from '../utils/fechas';

// El vendedor mueve la visita a otro horario libre de su disponibilidad
export default function ReprogramarVisitaModal({ visita, onCerrar }) {
  const [fechaHora, setFechaHora] = useState(null);
  const actualizar = useActualizarVisita();
  const toast = useToast();

  function reprogramar(e) {
    e.preventDefault();
    if (!fechaHora) return;
    actualizar.mutate({ visita, cambio: { estado: 'reprogramada', fecha_hora: fechaHora } }, {
      onSuccess: () => {
        toast(`Visita reprogramada para el ${fechaHoraVisita(fechaHora)}. ${visita.contraparte.nombre} recibirá un aviso.`, 'success', 6000);
        onCerrar();
      },
      onError: (err) => {
        if (err.code === 'HORARIO_OCUPADO') setFechaHora(null);
        toast(err.code === 'HORARIO_OCUPADO' ? 'Ese horario ya está ocupado. Elige otro.' : (err.message ?? 'No se pudo reprogramar'), 'error');
      },
    });
  }

  return (
    <Modal open onClose={onCerrar} title="Reprogramar visita" size="xl">
      <form onSubmit={reprogramar} className="space-y-4">
        <p className="text-sm text-secondary-600">
          {visita.contraparte.nombre} tiene la visita a <span className="font-medium text-secondary-800">{visita.propiedad.titulo}</span> el{' '}
          <span className="font-medium text-secondary-800">{fechaHoraVisita(visita.fecha_hora)}</span>. Elige el nuevo horario:
        </p>

        <SelectorHorario propiedadId={visita.propiedad.id} valor={fechaHora} onChange={setFechaHora} excluir={visita.fecha_hora} />

        <div className="flex flex-col-reverse gap-2 border-t border-secondary-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary-600" aria-live="polite">
            {fechaHora ? <>Nuevo horario: <span className="font-semibold text-secondary-900">{fechaHoraVisita(fechaHora)}</span></> : 'Aún no eliges el nuevo horario.'}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCerrar}>Cancelar</Button>
            <Button type="submit" disabled={!fechaHora} loading={actualizar.isPending}>
              <CalendarClock size={16} aria-hidden="true" /> Reprogramar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
