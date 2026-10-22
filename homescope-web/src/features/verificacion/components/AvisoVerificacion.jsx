import { Link } from 'react-router-dom';
import { Clock, ShieldAlert } from 'lucide-react';
import { useMiVerificacion } from '../hooks/useVerificacion';

// Aviso para el vendedor sin identidad verificada: puede preparar borradores, pero no publicar.
// No se muestra a los verificados ni a otros roles
export default function AvisoVerificacion({ className = '' }) {
  const { data } = useMiVerificacion();
  if (!data || data.verificado) return null;
  const pendiente = data.solicitud?.estado === 'pendiente';
  const Icono = pendiente ? Clock : ShieldAlert;

  return (
    <div role="status" className={['flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800', className].join(' ')}>
      <Icono size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{pendiente ? 'Estamos revisando tu identidad' : 'Verifica tu identidad para publicar'}</p>
        <p>
          {pendiente
            ? 'Puedes preparar tus anuncios y guardarlos como borrador; podrás publicarlos cuando aprobemos tu documento.'
            : data.solicitud?.estado === 'rechazada'
              ? `Tu solicitud anterior fue rechazada (${data.solicitud.motivo_rechazo}). Envía tu documento de nuevo para poder publicar.`
              : 'Puedes preparar tus anuncios como borrador, pero para publicarlos necesitamos verificar tu documento de identidad.'}
        </p>
        {!pendiente && (
          <Link to="/verificacion" className="mt-1 inline-block font-medium text-warning-900 underline hover:no-underline">Verificar mi identidad</Link>
        )}
      </div>
    </div>
  );
}
