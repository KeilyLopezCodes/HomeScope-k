import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Clock, FileUp, Lock, XCircle } from 'lucide-react';
import { Badge, Button, Card, Select, Spinner, useToast } from '../../../shared/components/ui';
import { useEnviarVerificacion, useMiVerificacion } from '../hooks/useVerificacion';
import { DOCUMENTO_CONFIG, TIPOS_DOCUMENTO } from '../services/verificacionService';

const fecha = (f) => new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(f));
const MB = DOCUMENTO_CONFIG.maxBytes / (1024 * 1024);

function FormularioDocumento({ reintento }) {
  const toast = useToast();
  const enviar = useEnviarVerificacion();
  const [tipo, setTipo] = useState('dpi');
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState(null);

  function elegir(e) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !DOCUMENTO_CONFIG.tipos.includes(f.type)) { setArchivo(null); return setError('Formato no permitido: usa una foto (JPG, PNG o WEBP) o un PDF.'); }
    if (f && f.size > DOCUMENTO_CONFIG.maxBytes) { setArchivo(null); return setError(`El archivo pesa más de ${MB} MB.`); }
    setArchivo(f);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!archivo) return setError('Adjunta una foto o PDF de tu documento.');
    enviar.mutate({ tipo_documento: tipo, archivo }, {
      onSuccess: () => toast('Documento enviado. Te avisaremos cuando lo revisemos.', 'success'),
      onError:   (err) => setError(err.message ?? 'No se pudo enviar el documento'),
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h2 className="text-base font-semibold text-secondary-900">{reintento ? 'Enviar el documento de nuevo' : 'Envía tu documento de identidad'}</h2>
      <Select id="tipo-documento" label="Tipo de documento" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        {Object.entries(TIPOS_DOCUMENTO).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
      </Select>
      <div>
        <label htmlFor="documento" className="mb-1 block text-sm font-medium text-secondary-700">Foto o PDF del documento <span className="text-danger-600">*</span></label>
        <label
          htmlFor="documento"
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed px-4 py-6 text-center text-sm',
            error ? 'border-danger-500 bg-danger-50' : 'border-secondary-300 hover:border-primary-500 hover:bg-primary-50',
          ].join(' ')}
        >
          <FileUp size={22} className="text-secondary-400" aria-hidden="true" />
          {archivo ? <span className="font-medium text-secondary-800 break-all">{archivo.name}</span> : <span className="text-secondary-500">Haz clic para elegir el archivo</span>}
          <span className="text-xs text-secondary-400">JPG, PNG, WEBP o PDF · máximo {MB} MB · que se lean tu nombre y tu foto</span>
        </label>
        <input id="documento" type="file" accept={DOCUMENTO_CONFIG.tipos.join(',')} onChange={elegir} className="sr-only" aria-describedby={error ? 'documento-error' : undefined} />
        {error && <p id="documento-error" role="alert" className="mt-1 text-xs text-danger-600">{error}</p>}
      </div>
      <p className="flex items-start gap-2 text-xs text-secondary-500">
        <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Tu documento se guarda de forma privada: solo el equipo de administración lo ve para verificar tu identidad. No se muestra en tu perfil.
      </p>
      <Button type="submit" loading={enviar.isPending}>Enviar documento</Button>
    </form>
  );
}

export default function VerificacionPage() {
  const { data, isPending, isError, refetch } = useMiVerificacion();
  const solicitud = data?.solicitud;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-secondary-900">Verificar identidad</h1>
      <p className="mb-6 text-sm text-secondary-500">
        Para publicar propiedades necesitas verificar tu identidad. Así los compradores saben que tratan con una persona real:
        tu perfil y tus anuncios muestran la insignia <Badge variant="verificado" className="align-middle"><BadgeCheck size={12} aria-hidden="true" /> Vendedor verificado</Badge>.
      </p>

      {isPending ? <div className="flex justify-center py-12"><Spinner /></div>
        : isError ? (
          <Card className="p-6 text-center">
            <p className="mb-3 text-sm text-secondary-700">No se pudo cargar el estado de tu verificación.</p>
            <Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>
          </Card>
        ) : data.verificado ? (
          <Card className="flex items-start gap-3 p-6">
            <BadgeCheck size={28} className="shrink-0 text-success-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-secondary-900">Tu identidad está verificada</p>
              <p className="text-sm text-secondary-600">Ya puedes publicar propiedades y tu perfil muestra la insignia de vendedor verificado.</p>
              <Link to="/publicar" className="mt-3 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">Publicar una propiedad →</Link>
            </div>
          </Card>
        ) : solicitud?.estado === 'pendiente' ? (
          <Card className="flex items-start gap-3 p-6">
            <Clock size={28} className="shrink-0 text-warning-600" aria-hidden="true" />
            <div>
              <p className="font-semibold text-secondary-900">Estamos revisando tu documento</p>
              <p className="text-sm text-secondary-600">
                Lo enviaste el {fecha(solicitud.fecha_solicitud)} ({TIPOS_DOCUMENTO[solicitud.tipo_documento]}).
                Te avisaremos con una notificación en cuanto el equipo lo revise. Mientras tanto puedes preparar tus anuncios como borradores.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="space-y-4 p-6">
            {solicitud?.estado === 'rechazada' && (
              <div role="alert" className="flex items-start gap-2 rounded border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
                <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  No pudimos verificar el documento que enviaste el {fecha(solicitud.fecha_solicitud)}.
                  <span className="block font-medium">Motivo: {solicitud.motivo_rechazo}</span>
                </span>
              </div>
            )}
            <FormularioDocumento reintento={solicitud?.estado === 'rechazada'} />
          </Card>
        )}
    </div>
  );
}
