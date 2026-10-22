import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Modal, Textarea } from '../../../shared/components/ui';

const MOTIVO_MIN = 5;
const MOTIVO_MAX = 300;

// Confirmación de una acción de moderación. El motivo es obligatorio: queda en el registro de acciones.
//   accion: { titulo, descripcion, confirmar, variante: 'primary' | 'danger', objetivo, irreversible,
//             etiquetaMotivo?, ejemplo? (texto y ejemplo del campo de motivo) }
//   onConfirmar(motivo): promesa; si falla se muestra el mensaje del backend sin cerrar el diálogo
export default function DialogoAccion({ accion, onCerrar, onConfirmar, enviando }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => { setMotivo(''); setError(null); }, [accion]);

  async function confirmar(e) {
    e.preventDefault();
    const texto = motivo.trim();
    if (texto.length < MOTIVO_MIN) return setError(`Explica el motivo (mínimo ${MOTIVO_MIN} caracteres): queda en el registro.`);
    setError(null);
    try {
      await onConfirmar(texto);
    } catch (err) {
      setError(err?.message ?? 'No se pudo completar la acción');
    }
  }

  return (
    <Modal open={Boolean(accion)} onClose={() => !enviando && onCerrar()} title={accion?.titulo} size="md">
      {accion && (
        <form onSubmit={confirmar} noValidate className="space-y-4">
          {accion.objetivo && <p className="text-sm font-medium text-secondary-900 break-words">{accion.objetivo}</p>}
          <p className="text-sm text-secondary-600">{accion.descripcion}</p>
          {accion.irreversible && (
            <p className="flex items-start gap-2 rounded border border-danger-200 bg-danger-50 p-2 text-sm text-danger-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              Esta acción no se puede deshacer.
            </p>
          )}
          <Textarea
            id="motivo-accion"
            label={accion.etiquetaMotivo ?? 'Motivo'}
            required
            maxLength={MOTIVO_MAX}
            rows={3}
            placeholder={accion.ejemplo ?? 'Ej.: Las fotos no corresponden a la propiedad publicada.'}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            error={error}
            autoFocus
          />
          <p className="-mt-3 text-right text-xs text-secondary-400 tabular-nums">{motivo.length}/{MOTIVO_MAX}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>Cancelar</Button>
            <Button type="submit" variant={accion.variante ?? 'primary'} loading={enviando}>{accion.confirmar}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
