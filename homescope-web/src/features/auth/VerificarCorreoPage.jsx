import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import AuthLayout from './components/AuthLayout';

// Una sola petición por token: en desarrollo React ejecuta el efecto dos veces y la segunda
// encontraría el token ya usado. Las dos ejecuciones comparten la misma promesa
const verificaciones = new Map();
function verificarToken(token) {
  if (!verificaciones.has(token)) {
    verificaciones.set(token, apiClient(`/api/v1/auth/verificar-correo?token=${encodeURIComponent(token)}`));
  }
  return verificaciones.get(token);
}

const estiloBoton = 'inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

export default function VerificarCorreoPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  // 'cargando' | 'ok' | 'ya_verificado' | 'expirado' | 'error'
  const [estado, setEstado] = useState(token ? 'cargando' : 'error');
  const [mensaje, setMensaje] = useState(token ? '' : 'El enlace no contiene un token válido.');

  useEffect(() => {
    if (!token) return;
    let activo = true;
    verificarToken(token)
      .then((res) => { if (activo) setEstado(res?.ya_verificado ? 'ya_verificado' : 'ok'); })
      .catch((err) => {
        if (!activo) return;
        setEstado(err?.code === 'TOKEN_EXPIRADO' ? 'expirado' : 'error');
        setMensaje(err?.message ?? 'El enlace no es válido o ya fue utilizado.');
      });
    return () => { activo = false; };
  }, [token]);

  return (
    <AuthLayout>
      <div className="space-y-4 text-center" aria-live="polite">
        {estado === 'cargando' && (
          <>
            <Loader2 size={40} className="mx-auto animate-spin text-primary-600" aria-hidden="true" />
            <p className="text-secondary-600">Verificando tu correo…</p>
          </>
        )}

        {(estado === 'ok' || estado === 'ya_verificado') && (
          <>
            <CheckCircle2 size={48} className="mx-auto text-success-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-secondary-900">
              {estado === 'ok' ? '¡Correo verificado!' : 'Tu correo ya está verificado'}
            </h1>
            <p className="text-secondary-600">Tu cuenta está activa. Ya puedes iniciar sesión.</p>
            <Link to="/login" className={estiloBoton}>Iniciar sesión</Link>
          </>
        )}

        {estado === 'expirado' && (
          <>
            <Clock size={48} className="mx-auto text-warning-500" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-secondary-900">El enlace expiró</h1>
            <p className="text-secondary-600">
              Los enlaces de verificación son válidos por 24 horas. Comunícate con el soporte de HomeScope para activar tu cuenta.
            </p>
            <Link to="/login" className="inline-block font-medium text-primary-600 hover:underline">Ir al inicio de sesión</Link>
          </>
        )}

        {estado === 'error' && (
          <>
            <XCircle size={48} className="mx-auto text-danger-600" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-secondary-900">Enlace inválido</h1>
            <p className="text-secondary-600">{mensaje}</p>
            <Link to="/login" className="inline-block font-medium text-primary-600 hover:underline">Ir al inicio de sesión</Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
