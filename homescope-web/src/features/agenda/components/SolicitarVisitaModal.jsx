import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import { Button, Modal, useToast } from '../../../shared/components/ui';
import SelectorHorario from './SelectorHorario';
import { useSolicitarVisita } from '../hooks/useAgenda';
import { fechaHoraVisita } from '../utils/fechas';

// El comprador elige día y hora en el calendario y envía la solicitud al vendedor
export default function SolicitarVisitaModal({ propiedad, onCerrar }) {
  const [fechaHora, setFechaHora] = useState(null);
  const [nota, setNota] = useState('');
  const [error, setError] = useState(null);
  const solicitar = useSolicitarVisita();
  const toast = useToast();

  function enviar(e) {
    e.preventDefault();
    if (!fechaHora) return;
    setError(null);
    solicitar.mutate({ propiedadId: propiedad.id, fechaHora, nota: nota.trim() }, {
      onSuccess: (visita) => {
        toast(`Solicitud enviada para el ${fechaHoraVisita(visita.fecha_hora)}. Te avisaremos cuando el vendedor responda.`, 'success', 6000);
        onCerrar();
      },
      onError: (err) => {
        // Otro comprador tomó el horario mientras elegía: se recargan los horarios y se pide elegir otro
        if (err.code === 'HORARIO_OCUPADO') setFechaHora(null);
        setError(err);
      },
    });
  }

  return (
    <Modal open onClose={onCerrar} title="Solicitar visita" size="xl">
      <form onSubmit={enviar} className="space-y-4">
        <p className="text-sm text-secondary-600">
          Elige un día y una hora disponibles para visitar <span className="font-medium text-secondary-800">{propiedad.titulo}</span>.
        </p>

        <SelectorHorario propiedadId={propiedad.id} valor={fechaHora} onChange={setFechaHora} />

        <div>
          <label htmlFor="visita-nota" className="mb-1 block text-sm font-medium text-secondary-700">
            Nota para el vendedor <span className="font-normal text-secondary-400">(opcional)</span>
          </label>
          <textarea
            id="visita-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Por ejemplo: llegaré con mi familia."
            className="w-full resize-none rounded border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {error.code === 'HORARIO_OCUPADO' && 'Alguien más acaba de tomar ese horario. Elige otro.'}
            {error.code === 'VISITA_ACTIVA' && (
              <>Ya tienes una visita pendiente o confirmada para esta propiedad. <Link to="/visitas" className="font-medium underline">Ver mis visitas</Link></>
            )}
            {!['HORARIO_OCUPADO', 'VISITA_ACTIVA'].includes(error.code) && (error.message ?? 'No se pudo enviar la solicitud.')}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-secondary-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary-600" aria-live="polite">
            {fechaHora ? <>Visita el <span className="font-semibold text-secondary-900">{fechaHoraVisita(fechaHora)}</span></> : 'Aún no eliges un horario.'}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCerrar}>Cancelar</Button>
            <Button type="submit" disabled={!fechaHora} loading={solicitar.isPending}>
              <CalendarCheck size={16} aria-hidden="true" /> Enviar solicitud
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
