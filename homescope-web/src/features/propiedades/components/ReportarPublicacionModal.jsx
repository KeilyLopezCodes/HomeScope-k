import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Modal, Select, Textarea, useToast } from '../../../shared/components/ui';
import { reportarPublicacion } from '../services/propiedadesService';

// Mismos motivos que el backend (MOTIVOS_REPORTE en moderacion.schemas.js)
const MOTIVOS = [
  { valor: 'informacion_falsa', etiqueta: 'La información es falsa (fotos, precio o datos que no corresponden)' },
  { valor: 'fraude',            etiqueta: 'Parece un fraude (pide dinero por adelantado, suplanta a alguien…)' },
  { valor: 'spam',              etiqueta: 'Es spam o está repetida' },
  { valor: 'ofensivo',          etiqueta: 'Contenido ofensivo' },
  { valor: 'datos_personales',  etiqueta: 'Expone datos personales de alguien' },
  { valor: 'otro',              etiqueta: 'Otro motivo' },
];

// Reportar una publicación sospechosa. El reporte llega a la cola del administrador
export default function ReportarPublicacionModal({ propiedad, onCerrar }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState('informacion_falsa');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (motivo === 'otro' && descripcion.trim().length < 5) return setError('Cuéntanos el motivo del reporte.');
    setEnviando(true);
    setError(null);
    try {
      await reportarPublicacion(propiedad.id, { motivo, descripcion: descripcion.trim() || undefined });
      setEnviado(true);
    } catch (err) {
      // 409: ya la había reportado y el reporte sigue abierto
      if (err.status === 409) { toast(err.message, 'info'); onCerrar(); return; }
      setError(err.message ?? 'No se pudo enviar el reporte');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal open onClose={() => !enviando && onCerrar()} title="Reportar publicación" size="md">
      {enviado ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 size={40} className="mx-auto text-success-600" aria-hidden="true" />
          <p className="text-sm text-secondary-700">
            Gracias por avisarnos. El equipo de moderación revisará la publicación; si no cumple las normas, la pausará o la eliminará.
          </p>
          <Button onClick={onCerrar}>Cerrar</Button>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-4">
          <p className="text-sm text-secondary-600 break-words">
            ¿Qué tiene de sospechoso <span className="font-medium text-secondary-900">"{propiedad.titulo}"</span>? El vendedor no sabrá quién la reportó.
          </p>
          <Select id="motivo-reporte" label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
          </Select>
          <Textarea
            id="descripcion-reporte"
            label={motivo === 'otro' ? 'Detalle' : 'Detalle (opcional)'}
            required={motivo === 'otro'}
            rows={3}
            maxLength={1000}
            placeholder="Ej.: Me pidieron un depósito para poder visitar la casa."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            error={error}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>Cancelar</Button>
            <Button type="submit" variant="danger" loading={enviando}>Enviar reporte</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
